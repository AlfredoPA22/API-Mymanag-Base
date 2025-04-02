import { Types as MongooseTypes } from "mongoose";
import { IPermission } from "./permission.interface";

export interface IRole {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  permission: IPermission[];
}

export interface RoleInput {
  name: string;
  description?: string;
  permission: string[];
}
