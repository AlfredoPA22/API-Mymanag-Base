import { Types as MongooseTypes } from "mongoose";

export interface IUser {
  _id: MongooseTypes.ObjectId;
  user_name: string;
  password: string;
  is_active: boolean;
}

export interface UserInput {
  user_name: string;
  password: string;
}

export interface LoginInput {
  user_name: string;
  password: string;
}
