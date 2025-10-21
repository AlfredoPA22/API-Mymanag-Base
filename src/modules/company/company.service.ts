import { addDays, addMonths } from "date-fns";
import {
  CompanyInput,
  ICompany,
  ICompanyWithPayment,
} from "../../interfaces/company.interface";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { Company } from "./company.model";
import { User } from "../user/user.model";
import { Role } from "../role/role.model";
import { PERMISSIONS_MOCK } from "../permission/utils/permissionsMock";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { sendCredentialsEmail } from "../../utils/sendCredentialsEmail";
import { UserLanding } from "../user_landing/user_landing.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";

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

  if (companyLimit.length >= 3) {
    throw new Error("LLegaste al limite de empresas.");
  }

  const alreadyHasFree = companyLimit.some((c) => c.plan === companyPlan.FREE);

  if (alreadyHasFree && companyInput.plan === companyPlan.FREE) {
    throw new Error("Solo puedes tener una empresa con plan gratuito.");
  }

  const isFreePlan: boolean = companyInput.plan === companyPlan.FREE;
  const now = new Date();

  const status = isFreePlan ? companyStatus.ACTIVE : companyStatus.PENDING;
  const trial_expires_at = isFreePlan ? addDays(now, 7) : null;

  const newCompany = await Company.create({
    ...companyInput,
    status,
    trial_expires_at,
    created_by: userId,
  });

  if (isFreePlan) {
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

    // await sendCredentialsEmail({
    //   to: userInfo.email,
    //   user_name,
    //   password,
    //   company_name: newCompany.name,
    // });

    return {
      company: newCompany,
      adminCredentials: {
        user_name,
        password,
      },
    };
  } else {
    return {
      company: newCompany,
      adminCredentials: {
        user_name: "",
        password: "",
      },
    };
  }
};

export const generateUsername = (name: string): string => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").slice(0, 12);
  const random = Math.floor(100 + Math.random() * 900);
  return `${slug}-${random}`;
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
