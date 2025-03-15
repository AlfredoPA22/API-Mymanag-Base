import { Types as MongooseTypes } from "mongoose";

export interface IBrand {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  count_product: number;
  is_active: boolean;
}

export interface BrandInput {
  name: string;
  description?: string;
}

export interface UpdateBrandInput {
  name: string;
  description: string;
}
