import { Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";

export interface IBrand {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  count_product: number;
  is_active: boolean;
  company: ICompany;
}

export interface BrandInput {
  name: string;
  description?: string;
}

export interface UpdateBrandInput {
  name: string;
  description: string;
}
