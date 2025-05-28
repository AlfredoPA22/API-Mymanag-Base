import { Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";

export interface IRole {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  permission: [];
  company: ICompany;
}

export interface RoleInput {
  name: string;
  description?: string;
  permission: string[];
}
