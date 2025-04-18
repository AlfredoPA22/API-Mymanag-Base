import { Types as MongooseTypes } from "mongoose";

export interface IRole {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  permission: [];
}

export interface RoleInput {
  name: string;
  description?: string;
  permission: string[];
}
