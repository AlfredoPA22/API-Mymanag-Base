import {
  BrandInput,
  IBrand,
  UpdateBrandInput,
} from "../../interfaces/brand.interface";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { LoginInput, UserInput } from "../../interfaces/user.interface";
import { User } from "./user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const create = async (userInput: UserInput) => {
  const user = await User.findOne({
    user_name: userInput.user_name,
  });

  if (user) {
    throw new Error("El usuario ya existe");
  }

  const newUser = await User.create(userInput);

  return newUser;
};

export const login = async (loginInput: LoginInput) => {
  const user = await User.findOne({
    user_name: loginInput.user_name,
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const isMatch = await bcrypt.compare(loginInput.password, user.password);

  if (!isMatch) {
    throw new Error("Credenciales invalidos");
  }

  const token = jwt.sign(
    { id: user._id, username: user.user_name, access: true },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  return token;
};
