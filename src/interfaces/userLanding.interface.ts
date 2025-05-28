import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IRole } from "./role.interface";
import { ICompany } from "./company.interface";

export interface IUserLanding {
  _id: MongooseTypes.ObjectId;
  user_name: string;
  password: string;
  role: IRole;
  is_active: boolean;
  is_global: boolean;
  company: ICompany;
}

export interface LoginLandingInput {
  clientId: string;
  credential: string;
}
