import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";

import { IBrand } from "./brand.interface";
import { ICategory } from "./category.interface";

import { stockType } from "../utils/enums/stockType.enum";
import { purchaseOrderStatus } from "../utils/enums/purchaseOrderStatus.enum";

export interface IProduct {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  code: string;
  name: string;
  description: string;
  image: string;
  sale_price: number;
  stock: number;
  last_cost_price: number;
  category: ICategory;
  brand: IBrand;
  stock_type: stockType;
  status: purchaseOrderStatus;
}

export interface ProductInput {
  code?: string;
  name: string;
  description?: string;
  image?: string;
  sale_price?: number;
  category: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  brand: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  stock_type: stockType;
}

export interface UpdateProductInput {
  name: string;
  description: string;
  sale_price: number;
  category: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  brand: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}
