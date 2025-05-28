import { Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";

export interface IWarehouse {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  is_active: boolean;
  company: ICompany;
}

export interface WarehouseInput {
  name: string;
  description?: string;
}

export interface UpdateWarehouseInput {
  name: string;
  description: string;
}
