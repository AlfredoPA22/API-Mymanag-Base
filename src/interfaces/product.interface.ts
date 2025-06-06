import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";

import { IBrand } from "./brand.interface";
import { ICategory } from "./category.interface";

import { purchaseOrderStatus } from "../utils/enums/purchaseOrderStatus.enum";
import { stockType } from "../utils/enums/stockType.enum";
import { ICompany } from "./company.interface";

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
  min_stock: number;
  max_stock: number;
  status: purchaseOrderStatus;
  company: ICompany;
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
  min_stock: number;
  max_stock: number;
}

export interface UpdateProductInput {
  code: string;
  name: string;
  image: string;
  description: string;
  sale_price: number;
  category: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  brand: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  stock_type: stockType;
  min_stock: number;
  max_stock: number;
}

export interface FilterProductInput {
  category?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  brand?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  status?: string;
}
