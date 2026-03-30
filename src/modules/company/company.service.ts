import { addDays, addMonths } from "date-fns";
import {
  CompanyInput,
  ICompany,
  ICompanyWithPayment,
  UpdateCompanyInput,
} from "../../interfaces/company.interface";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { systemType } from "../../utils/enums/systemType.enum";
import { Company } from "./company.model";
import { User } from "../user/user.model";
import { Role } from "../role/role.model";
import { PERMISSIONS_MOCK } from "../permission/utils/permissionsMock";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { sendCredentialsEmail } from "../../utils/sendCredentialsEmail";
import { sendWelcomeEmail } from "../../utils/sendWelcomeEmail";
import { UserLanding } from "../user_landing/user_landing.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import { createReservaYaAdmin } from "../../utils/reservayaClient";

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
    {
      $addFields: {
        latest_payment: { $arrayElemAt: ["$payments", -1] },
      },
    },
    {
      $project: {
        payments: 0,
      },
    },
  ]);

  return listCompany;
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
    {
      $addFields: {
        latest_payment: { $arrayElemAt: ["$payments", -1] },
      },
    },
    {
      $project: {
        payments: 0,
      },
    },
  ]);

  return listCompany;
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

  // if (companyLimit.length >= 3) {
  //   throw new Error("LLegaste al limite de empresas.");
  // }

  const system = (companyInput.system as systemType) || systemType.MYMANAG;
  const isMyManag = system === systemType.MYMANAG;

  // Check free plan limit per system
  // const alreadyHasFreeForSystem = companyLimit.some((c) => {
  //   const sub = (c as any).subscriptions?.find((s: any) => s.system === system);
  //   if (sub) return sub.plan === companyPlan.FREE;
  //   return isMyManag && c.plan === companyPlan.FREE;
  // });
  // if (alreadyHasFreeForSystem && companyInput.plan === companyPlan.FREE) {
  //   throw new Error("Solo puedes tener una empresa con plan gratuito para este sistema.");
  // }

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
