import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IRole } from "./role.interface";

export interface IUser {
  _id: MongooseTypes.ObjectId;
  user_name: string;
  password: string;
  role: IRole;
  is_active: boolean;
}

export interface UserInput {
  user_name: string;
  password: string;
  role: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}

export interface LoginInput {
  user_name: string;
  password: string;
}
