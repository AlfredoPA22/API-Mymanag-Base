import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IRole } from "./role.interface";

export interface IWarehouse {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  is_active: boolean;
}

export interface WarehouseInput {
  name: string;
  description?: string;
}

export interface UpdateWarehouseInput {
  name: string;
  description: string;
}
