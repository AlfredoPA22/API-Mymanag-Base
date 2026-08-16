import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IRole } from "./role.interface";
import { ICompany } from "./company.interface";

export interface IUser {
  _id: MongooseTypes.ObjectId;
  user_name: string;
  password: string;
  role: IRole;
  is_active: boolean;
  is_global: boolean;
  company: ICompany;
  commission_rate?: number | null;
}

export interface UserInput {
  user_name: string;
  password: string;
  role: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  is_global: boolean;
  commission_rate?: number | null;
}

export interface LoginInput {
  user_name: string;
  password: string;
}

export interface UpdateUserInput {
  user_name: string;
  role: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  is_global: boolean;
  commission_rate?: number | null;
}

export interface changePasswordInput {
  currentPassword: string;
  newPassword: string;
}
