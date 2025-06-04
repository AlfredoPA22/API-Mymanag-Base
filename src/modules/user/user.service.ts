import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IUser,
  LoginInput,
  UpdateUserInput,
  UserInput,
} from "../../interfaces/user.interface";
import { User } from "./user.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { PurchaseOrder } from "../purchase_order/purchase_order.model";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IUser[]> => {
  return await User.find({
    company: companyId,
  })
    .populate("role")
    .populate("company")
    .lean<IUser[]>();
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userInput: UserInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const userCount = await User.countDocuments({ company: companyId });

  const planLimits = companyPlanLimits[company.plan as companyPlan];

  if (planLimits.maxUser && userCount >= planLimits.maxUser) {
    throw new Error(
      `Tu plan actual (${company.plan}) solo permite hasta ${planLimits.maxUser} usuarios`
    );
  }

  const user = await User.findOne({
    company: companyId,
    user_name: userInput.user_name,
  });

  if (user) {
    throw new Error("El usuario ya existe");
  }

  const newUser = (
    await User.create({ ...userInput, company: companyId })
  ).populate("role");

  return newUser;
};

export const switchUserState = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const user = await User.findOne({ _id: userId, company: companyId });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  user.is_active = !user.is_active;

  const updatedUser = await user.save();

  return updatedUser;
};

export const login = async (loginInput: LoginInput) => {
  const user = await User.findOne({
    user_name: loginInput.user_name,
  })
    .populate("role")
    .populate("company")
    .lean<IUser>();

  if (!user) {
    throw new Error("Usuario no encontrado");
  } else if (!user.is_active) {
    throw new Error("Usuario inactivo");
  }

  const isMatch = await bcrypt.compare(loginInput.password, user.password);

  if (!isMatch) {
    throw new Error("Credenciales invalidos");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está definido en el entorno");
  }

  const token = jwt.sign(
    {
      id: user._id,
      username: user.user_name,
      role: user.role.name,
      company: user.company.name,
      companyId: user.company._id,
      permissions: user.role.permission,
      access: true,
    },
    secret,
    {
      expiresIn: "1d",
    }
  );

  const tokenWithBearer = `Bearer ${token}`;

  return tokenWithBearer;
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateUserInput: UpdateUserInput
) => {
  const user = await User.findOne({ _id: userId, company: companyId });

  if (!user) {
    throw new Error("El usuario no existe");
  }

  const userUpdated = await User.findOneAndUpdate(
    { _id: userId, company: companyId },
    { $set: updateUserInput },
    { new: true }
  );

  return userUpdated;
};

export const deleteUser = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const user = await User.findOne({ _id: userId, company: companyId });

  if (!user) {
    throw new Error("El usuario no existe");
  }

  if (user.is_admin) {
    throw new Error("No se puede eliminar porque es administrador");
  }

  const findPurchaseOrder = await PurchaseOrder.find({
    company: companyId,
    created_by: userId,
  });

  const findSaleOrder = await SaleOrder.find({
    company: companyId,
    created_by: userId,
  });

  const findSalePayment = await SalePayment.find({
    company: companyId,
    created_by: userId,
  });

  if (
    findPurchaseOrder.length > 0 ||
    findSaleOrder.length > 0 ||
    findSalePayment.length > 0
  ) {
    throw new Error("No se puede eliminar porque pertenece a una transaccion");
  }

  const deleted = await User.deleteOne({
    _id: userId,
    company: companyId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};
