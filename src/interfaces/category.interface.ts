import { Types as MongooseTypes } from "mongoose";

export interface ICategory {
  _id: MongooseTypes.ObjectId;
  name: string;
  description: string;
  count_product: number;
  is_active: boolean;
}

export interface CategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name: string;
  description: string;
}
