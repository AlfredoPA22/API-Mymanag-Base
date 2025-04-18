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

export const findAll = async (): Promise<IUser[]> => {
  const listUser = await User.find().populate("role").lean<IUser[]>();

  return listUser;
};

export const create = async (userInput: UserInput) => {
  const user = await User.findOne({
    user_name: userInput.user_name,
  });

  if (user) {
    throw new Error("El usuario ya existe");
  }

  const newUser = (await User.create(userInput)).populate("role");

  return newUser;
};

export const switchUserState = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const user = await User.findById(userId);

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

  const token = jwt.sign(
    {
      id: user._id,
      username: user.user_name,
      role: user.role.name,
      permissions: user.role.permission,
      access: true,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  const tokenWithBearer = `Bearer ${token}`;

  return tokenWithBearer;
};

export const update = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateUserInput: UpdateUserInput
) => {
  const userUpdated = await User.findByIdAndUpdate(
    userId,
    { $set: updateUserInput },
    { new: true }
  );

  if (!userUpdated) {
    throw new Error("Ocurrio un error al actualizar el usuario.");
  }

  return userUpdated;
};

export const deleteUser = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const findPurchaseOrder = await PurchaseOrder.find({
    created_by: userId,
  });

  const findSaleOrder = await SaleOrder.find({
    created_by: userId,
  });

  if (findPurchaseOrder.length > 0 || findSaleOrder.length > 0) {
    throw new Error("No se puede eliminar porque pertenece a una transaccion");
  }

  const deleted = await User.deleteOne({
    _id: userId,
  });

  if (deleted.deletedCount > 0) {
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};
