import { addDays, addMonths } from "date-fns";
import {
  CompanyInput,
  ICompany,
  ICompanyWithPayment,
  UpdateCompanyInput,
} from "../../interfaces/company.interface";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { systemType } from "../../utils/enums/systemType.enum";
import { Company } from "./company.model";
import { User } from "../user/user.model";
import { Role } from "../role/role.model";
import { PERMISSIONS_MOCK } from "../permission/utils/permissionsMock";
import mongoose, { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { companyDataModels } from "../../utils/companyDataModels";
import { sendCredentialsEmail } from "../../utils/sendCredentialsEmail";
import { UserLanding } from "../user_landing/user_landing.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import { createReservaYaAdmin } from "../../utils/reservayaClient";
import { sendAdminNewCompanyEmail } from "../../utils/sendAdminNotificationEmail";

export interface AdjustSubscriptionInput {
  companyId: string;
  system: string;
  plan: string;
  status: string;
  subscription_expires_at?: string | null;
  trial_expires_at?: string | null;
}

// El último pago de una empresa depende de a qué sistema pertenece — una
// empresa con MyManag y ReservaYa tiene un "último pago" distinto para cada
// uno. Sin este scoping, un pago reciente de un sistema podía ocultar que el
// otro sistema tenía un pago pendiente o rechazado sin resolver.
const attachLatestPayments = (companies: any[]): ICompanyWithPayment[] => {
  return companies.map((company) => {
    const payments = (company.payments ?? []) as any[];
    const sortedAsc = [...payments].sort((a, b) => {
      const dateA = new Date(a.paid_at ?? a.createdAt).getTime();
      const dateB = new Date(b.paid_at ?? b.createdAt).getTime();
      return dateA - dateB;
    });

    const latestForSystem = (system: string) => {
      for (let i = sortedAsc.length - 1; i >= 0; i--) {
        const paymentSystem = sortedAsc[i].system || systemType.MYMANAG;
        if (paymentSystem === system) return sortedAsc[i];
      }
      return null;
    };

    const subscriptions = (company.subscriptions ?? []).map((sub: any) => ({
      ...sub,
      latest_payment: latestForSystem(sub.system),
    }));

    const { payments: _omit, ...rest } = company;

    return {
      ...rest,
      subscriptions,
      latest_payment: latestForSystem(systemType.MYMANAG),
    };
  });
};

export const findAll = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICompanyWithPayment[]> => {
  const listCompany = await Company.aggregate([
    {
      $match: { created_by: new MongooseTypes.ObjectId(`${userId}`) },
    },
    {
      $lookup: {
        from: "payment_landings",
        localField: "_id",
        foreignField: "company",
        as: "payments",
      },
    },
  ]);

  return attachLatestPayments(listCompany);
};

export const findAllAdmin = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICompanyWithPayment[]> => {
  const findUser = await UserLanding.findById(userId);
  if (!findUser) {
    throw new Error("No existe el usuario");
  } else if (findUser.user_type !== userLandingType.ADMIN) {
    throw new Error("Acceso denegado: solo para administradores");
  }

  const listCompany = await Company.aggregate([
    {
      $lookup: {
        from: "payment_landings",
        localField: "_id",
        foreignField: "company",
        as: "payments",
      },
    },
  ]);

  return attachLatestPayments(listCompany);
};

export const create = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyInput: CompanyInput
) => {
  const userInfo = await UserLanding.findById(userId);

  if (!userInfo) {
    throw new Error("usuario no encontrado");
  }

  const company = await Company.findOne({
    name: companyInput.name,
  });

  if (company) {
    throw new Error("La empresa ya existe");
  }

  const companyLimit = await Company.find({ created_by: userId });
  const isLandingAdmin = userInfo.user_type === userLandingType.ADMIN;

  if (!isLandingAdmin && companyLimit.length >= 3) {
    throw new Error("Llegaste al límite de empresas.");
  }

  const system = (companyInput.system as systemType) || systemType.MYMANAG;
  const isMyManag = system === systemType.MYMANAG;

  // Check free plan limit per system (los administradores de la Landing no
  // están sujetos a este límite — lo necesitan para crear empresas de
  // demostración/pruebas sin restricción).
  if (!isLandingAdmin && companyInput.plan === companyPlan.FREE) {
    const alreadyHasFreeForSystem = companyLimit.some((c) => {
      const sub = (c as any).subscriptions?.find((s: any) => s.system === system);
      if (sub) return sub.plan === companyPlan.FREE;
      return isMyManag && c.plan === companyPlan.FREE;
    });
    if (alreadyHasFreeForSystem) {
      throw new Error("Solo puedes tener una empresa con plan gratuito para este sistema.");
    }
  }

  const isFreePlan: boolean = companyInput.plan === companyPlan.FREE;
  const now = new Date();

  const subStatus = isFreePlan ? companyStatus.ACTIVE : companyStatus.PENDING;
  const subTrialExpires = isFreePlan ? addDays(now, 7) : null;

  const subscription = {
    system,
    plan: companyInput.plan || companyPlan.FREE,
    status: subStatus,
    trial_expires_at: subTrialExpires,
    subscription_expires_at: null,
    notified_before_expiration: false,
  };

  const slug = await generateUniqueSlug(companyInput.name);

  const newCompany = await Company.create({
    name: companyInput.name,
    slug,
    legal_name: companyInput.legal_name,
    nit: companyInput.nit,
    email: companyInput.email,
    phone: companyInput.phone,
    address: companyInput.address,
    country: companyInput.country,
    currency: companyInput.currency,
    plan: isMyManag ? (companyInput.plan || companyPlan.FREE) : companyPlan.FREE,
    status: isMyManag ? subStatus : companyStatus.PENDING,
    trial_expires_at: isMyManag ? subTrialExpires : null,
    subscriptions: [subscription],
    created_by: userId,
  });

  // Enviar welcome email solo para planes de pago (los gratuitos solo reciben credenciales)
  if (!isFreePlan) {
    const { sendWelcomeEmail } = await import("../../utils/sendWelcomeEmail");
    try {
      await sendWelcomeEmail({
        to: userInfo.email,
        company_name: newCompany.name,
        plan: subscription.plan,
      });
    } catch (error) {
      console.error(
        "⚠️ No se pudo enviar el correo de bienvenida, pero la empresa se creó correctamente:",
        error
      );
    }
  }

  // Notificar al administrador de Inventasys
  await sendAdminNewCompanyEmail({
    company_name: newCompany.name,
    user_name: userInfo.fullName,
    user_email: userInfo.email,
    plan: subscription.plan,
    system,
  });

  // Only create MyManag admin user for free MyManag plan
  if (isFreePlan && isMyManag) {
    const newRole = await Role.create({
      company: newCompany._id,
      name: "Administrador",
      description: "Rol administrador",
      permission: PERMISSIONS_MOCK,
    });

    const user_name = generateUsername(companyInput.name);
    const password = generatePassword();

    await User.create({
      company: newCompany._id,
      user_name,
      password,
      role: newRole._id,
      is_global: true,
      is_admin: true,
    });

    try {
      await sendCredentialsEmail({
        to: userInfo.email,
        user_name,
        password,
        company_name: newCompany.name,
      });
    } catch (error) {
      console.error(
        "⚠️ No se pudo enviar el correo con credenciales, pero el usuario se creó correctamente:",
        error
      );
    }

    return {
      company: newCompany,
      adminCredentials: { user_name, password },
    };
  }

  // Create ReservaYa admin user for free ReservaYa plan
  if (isFreePlan && system === systemType.RESERVAYA) {
    const user_name = generateUsername(companyInput.name);
    const password = generatePassword();

    const adminResult = await createReservaYaAdmin(
      companyInput.name,
      user_name,
      password,
      companyInput.phone,
      newCompany._id.toString()
    );

    if (!adminResult) {
      // Rollback: delete the company so the user can retry cleanly
      await newCompany.deleteOne();
      throw new Error(
        "No se pudo crear el usuario administrador en ReservaYa. " +
        "Verificá que el servicio de reservas esté disponible e intentá de nuevo."
      );
    }

    try {
      await sendCredentialsEmail({
        to: userInfo.email,
        user_name,
        password,
        company_name: newCompany.name,
        loginUrl: `${process.env.RESERVAYA_CLIENT_URL || 'http://localhost:5173'}/login`,
        systemName: 'ReservaYa',
      });
    } catch (error) {
      console.error(
        "⚠️ No se pudo enviar credenciales de ReservaYa:",
        error
      );
    }

    return {
      company: newCompany,
      adminCredentials: { user_name, password },
    };
  }

  return {
    company: newCompany,
    adminCredentials: { user_name: "", password: "" },
  };
};

export const generateUsername = (name: string): string => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").slice(0, 12);
  const random = Math.floor(100 + Math.random() * 900);
  return `${slug}-${random}`;
};

export const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);

export const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = generateSlug(name);
  let slug = base;
  let counter = 1;
  while (await Company.findOne({ slug })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
};

export const generatePassword = (): string => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

// Crea el rol Administrador + usuario de MyManag para una empresa que se
// activa por primera vez, y le envía las credenciales. Compartido entre
// approvePaymentLanding (aprobar un pago) y adjustSubscription (activación
// manual desde el panel admin de Landing) para que ninguno de los dos
// caminos deje a la empresa activa sin ningún usuario para entrar.
export const activateFirstMyManagUser = async (
  company: any,
  creatorEmail: string
): Promise<void> => {
  const role = await Role.create({
    company: company._id,
    name: "Administrador",
    description: "Rol administrador",
    permission: PERMISSIONS_MOCK,
  });

  const user_name = generateUsername(company.name);
  const password = generatePassword();

  await User.create({
    company: company._id,
    user_name,
    password,
    role: role._id,
    is_global: true,
    is_admin: true,
  });

  try {
    await sendCredentialsEmail({
      to: creatorEmail,
      user_name,
      password,
      company_name: company.name,
    });
  } catch (error) {
    console.error("⚠️ No se pudo enviar credenciales de MyManag:", error);
  }
};

// Equivalente para ReservaYa: crea el usuario administrador en el sistema
// externo de ReservaYa y envía credenciales. Mismo motivo que la función
// anterior — compartido entre approvePaymentLanding y adjustSubscription.
export const activateFirstReservaYaUser = async (
  company: any,
  creatorEmail: string
): Promise<void> => {
  const user_name = generateUsername(company.name as string);
  const password = generatePassword();

  await createReservaYaAdmin(
    company.name as string,
    user_name,
    password,
    company.phone,
    company._id.toString()
  );

  try {
    await sendCredentialsEmail({
      to: creatorEmail,
      user_name,
      password,
      company_name: company.name as string,
      loginUrl: `${process.env.RESERVAYA_CLIENT_URL || "http://localhost:5173"}/login`,
      systemName: "ReservaYa",
    });
  } catch (error) {
    console.error("⚠️ No se pudo enviar credenciales de ReservaYa:", error);
  }
};

export const detailCompany = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICompany> => {
  const company = await Company.findOne({
    _id: companyId,
  }).lean<ICompany>();

  if (!company) {
    throw new Error("No existe la empresa");
  }

  return company;
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateCompanyInput: UpdateCompanyInput
): Promise<ICompany> => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new Error("No existe la empresa");
  }

  const updateData: Partial<UpdateCompanyInput> = {};
  for (const [key, value] of Object.entries(updateCompanyInput)) {
    if (value !== null && value !== undefined) {
      (updateData as any)[key] = value;
    }
  }

  const updated = await Company.findByIdAndUpdate(
    companyId,
    { $set: updateData },
    { new: true }
  ).lean<ICompany>();

  return updated!;
};

export const adjustSubscription = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: AdjustSubscriptionInput
): Promise<ICompany> => {
  const adminUser = await UserLanding.findById(adminUserId);
  if (!adminUser) throw new Error("Usuario no encontrado");
  if (adminUser.user_type !== userLandingType.ADMIN) {
    throw new Error("Acceso denegado: solo para administradores");
  }

  const company = await Company.findById(input.companyId);
  if (!company) throw new Error("Empresa no encontrada");

  const system = input.system as systemType;
  const isMyManag = system === systemType.MYMANAG;

  const expiresAt = input.subscription_expires_at
    ? new Date(input.subscription_expires_at)
    : null;
  const trialExpiresAt = input.trial_expires_at
    ? new Date(input.trial_expires_at)
    : null;

  // Update or create subscription in subscriptions array
  const subIndex = (company as any).subscriptions.findIndex(
    (s: any) => s.system === system
  );
  const existingSubStatus: string | null =
    subIndex !== -1 ? (company as any).subscriptions[subIndex].status : null;

  const updatedSub = {
    system,
    plan: input.plan,
    status: input.status,
    trial_expires_at: trialExpiresAt,
    subscription_expires_at: expiresAt,
    notified_before_expiration: false,
  };

  if (subIndex === -1) {
    (company as any).subscriptions.push(updatedSub);
  } else {
    (company as any).subscriptions[subIndex] = updatedSub;
  }

  // Si el admin activa manualmente una empresa que nunca pasó por un pago
  // aprobado (o nunca tuvo esta suscripción), no existe todavía ningún
  // usuario para entrar — se crea aquí con el mismo criterio que
  // approvePaymentLanding, para que "Ajustar" nunca deje una empresa
  // activa sin nadie que pueda usarla.
  if (input.status === companyStatus.ACTIVE) {
    const companyCreator = await UserLanding.findById(company.created_by);
    if (companyCreator) {
      if (isMyManag) {
        const existingMyManagUser = await User.findOne({ company: company._id });
        if (!existingMyManagUser) {
          await activateFirstMyManagUser(company, companyCreator.email);
        }
      } else if (
        system === systemType.RESERVAYA &&
        (subIndex === -1 || existingSubStatus === companyStatus.PENDING)
      ) {
        await activateFirstReservaYaUser(company, companyCreator.email);
      }
    }
  }

  // Sync legacy top-level fields for MyManag backward compatibility
  if (isMyManag) {
    company.plan = input.plan as companyPlan;
    company.status = input.status as companyStatus;
    company.subscription_expires_at = expiresAt;
    company.trial_expires_at = trialExpiresAt;
    company.notified_before_expiration = false;

    // Si el plan nuevo no incluye tienda online, se apaga de verdad — así,
    // si más adelante vuelve a subir a un plan con tienda, queda apagada
    // hasta que el admin la reactive manualmente (no se reactiva sola).
    if (!companyPlanLimits[input.plan as companyPlan]?.hasStore) {
      company.store_enabled = false;
    }
  }

  (company as any).markModified("subscriptions");
  await company.save();

  return company.toObject() as ICompany;
};

const assertLandingAdmin = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const adminUser = await UserLanding.findById(adminUserId);
  if (!adminUser) throw new Error("Usuario no encontrado");
  if (adminUser.user_type !== userLandingType.ADMIN) {
    throw new Error("Acceso denegado: solo para administradores");
  }
};

const countCompanyData = async (companyId: string) => {
  const counts = await Promise.all(
    companyDataModels.map(({ model }) => model.countDocuments({ company: companyId }))
  );
  return Object.fromEntries(
    companyDataModels.map(({ key }, i) => [key, counts[i]])
  ) as Record<string, number>;
};

export const getCompanyDeletionReport = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyId: string
) => {
  await assertLandingAdmin(adminUserId);

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const counts = await countCompanyData(companyId);

  return { companyName: company.name, ...counts };
};

export const deleteCompanyPermanently = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyId: string,
  confirmationText: string
) => {
  await assertLandingAdmin(adminUserId);

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  if (confirmationText.trim() !== company.name) {
    throw new Error(
      "El texto de confirmación no coincide con el nombre de la empresa"
    );
  }

  const counts = await countCompanyData(companyId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const { model } of companyDataModels) {
        await model.deleteMany({ company: companyId }, { session });
      }
      await Company.deleteOne({ _id: companyId }, { session });
    });
  } finally {
    await session.endSession();
  }

  return { success: true, deletedCounts: { companyName: company.name, ...counts } };
};

export const generateCompanyBackup = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyId: string
) => {
  await assertLandingAdmin(adminUserId);

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const data: Record<string, any[]> = {};
  for (const { key, model } of companyDataModels) {
    data[key] = await model.find({ company: companyId }).lean();
  }

  const backup = {
    generatedAt: new Date().toISOString(),
    company,
    data,
  };

  return JSON.stringify(backup);
};
