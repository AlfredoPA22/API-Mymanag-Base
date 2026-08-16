import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  changePasswordInput,
  IUser,
  LoginInput,
  UpdateUserInput,
  UserInput,
} from "../../interfaces/user.interface";
import { User } from "./user.model";
import { Role } from "../role/role.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { PurchaseOrder } from "../purchase_order/purchase_order.model";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { SaleReturn } from "../sale_return/sale_return.model";
import { ProductTransfer } from "../product_transfer/product_transfer.model";
import { QrPayment } from "../qr_payment/qr_payment.model";
import { Commission } from "../commission/commission.model";
import { commissionStatus } from "../../utils/enums/commissionStatus.enum";
import { CashRegister } from "../cash_register/cash_register.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { assertPlanLimit } from "../../utils/assertPlanLimit";

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

  assertPlanLimit(company.plan as companyPlan, "usuarios", userCount, planLimits.maxUser);

  const user = await User.findOne({
    company: companyId,
    user_name: userInput.user_name,
  });

  if (user) {
    throw new Error("El usuario ya existe");
  }

  // Sin esto, se podía guardar un `role` que no existe o que pertenece a
  // OTRA empresa (nunca se validaba) — el usuario quedaba con una
  // referencia rota/cruzada que después hacía crashear UserDetail.tsx si
  // ese rol se borraba en su empresa real.
  if (userInput.role) {
    const foundRole = await Role.findOne({ _id: userInput.role, company: companyId });
    if (!foundRole) {
      throw new Error("El rol seleccionado no existe en esta empresa");
    }
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

  if (user.is_admin) {
    throw new Error("No se puede desactivar este usuario");
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
  } else if (!user.role) {
    // Dato viejo con rol huérfano (de antes de validar esto en create/update).
    throw new Error("Tu rol de usuario ya no existe. Contactá a un administrador.");
  }

  const isMatch = await bcrypt.compare(loginInput.password, user.password);

  if (!isMatch) {
    throw new Error("Credenciales invalidos");
  }

  if (user.company.status === companyStatus.EXPIRED) {
    throw new Error(
      "La suscripción de tu empresa venció. Contacta al administrador para renovarla."
    );
  }
  if (user.company.status === companyStatus.SUSPENDED) {
    throw new Error("Tu empresa está suspendida. Contacta a soporte.");
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
      companyLogo: user.company.image,
      companyId: user.company._id,
      currency: user.company.currency,
      permissions: user.role.permission,
      is_global: user.is_global ?? false,
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

  if (
    user.is_admin &&
    updateUserInput.role &&
    updateUserInput.role.toString() !== user.role.toString()
  ) {
    throw new Error("No se puede cambiar el rol de este usuario.");
  }

  if (
    updateUserInput.user_name &&
    updateUserInput.user_name !== user.user_name
  ) {
    const exists = await User.findOne({
      username: updateUserInput.user_name,
      _id: { $ne: userId },
    });

    if (exists) {
      throw new Error("El nombre de usuario ya está en uso.");
    }
  }

  if (updateUserInput.role && updateUserInput.role.toString() !== user.role.toString()) {
    const foundRole = await Role.findOne({ _id: updateUserInput.role, company: companyId });
    if (!foundRole) {
      throw new Error("El rol seleccionado no existe en esta empresa");
    }
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
    throw new Error("No se puede eliminar este usuario.");
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

  // Antes solo se chequeaban estas 3 colecciones — un usuario que solo
  // había hecho devoluciones, transferencias, cobros QR, o movimientos de
  // caja (sin ser autor directo de una venta/compra/pago) se podía borrar
  // igual, dejando esas referencias apuntando a un usuario inexistente.
  const findSaleReturn = await SaleReturn.find({ company: companyId, created_by: userId });
  const findProductTransfer = await ProductTransfer.find({ company: companyId, created_by: userId });
  const findQrPayment = await QrPayment.find({ company: companyId, created_by: userId });
  const findCommission = await Commission.find({
    company: companyId,
    status: { $ne: commissionStatus.ANULADA },
    $or: [{ seller: userId }, { paid_by: userId }],
  });
  const findCashRegister = await CashRegister.find({
    company: companyId,
    $or: [
      { opened_by: userId },
      { closed_by: userId },
      { "movements.created_by": userId },
    ],
  });

  if (
    findPurchaseOrder.length > 0 ||
    findSaleOrder.length > 0 ||
    findSalePayment.length > 0 ||
    findSaleReturn.length > 0 ||
    findProductTransfer.length > 0 ||
    findQrPayment.length > 0 ||
    findCommission.length > 0 ||
    findCashRegister.length > 0
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

export const changePassword = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  changePasswordInput: changePasswordInput
) => {
  const user = await User.findOne({ _id: userId, company: companyId });

  if (!user) {
    throw new Error("El usuario no existe");
  }

  const isMatch = await bcrypt.compare(
    changePasswordInput.currentPassword,
    user.password
  );

  if (!isMatch) {
    throw new Error("La contraseña actual es incorrecta");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(
    changePasswordInput.newPassword,
    salt
  );

  const userUpdated = await User.findOneAndUpdate(
    { _id: userId, company: companyId },
    {
      $set: {
        password: hashedPassword,
      },
    },
    { new: true }
  );

  return userUpdated;
};
