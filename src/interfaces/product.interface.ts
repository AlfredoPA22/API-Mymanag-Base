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
  images?: string[];
  show_in_store?: boolean;
  sale_price: number;
  store_price?: number | null;
  store_discount_price?: number | null;
  stock: number;
  // Solo para stock_type INDIVIDUAL: cuánto de `stock` está realmente libre
  // para vender ahora mismo (stock ya cuenta lo reservado por otras ventas
  // en Borrador). Se calcula al listar, no se guarda — ver findAll().
  available_stock?: number;
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
  images?: string[];
  show_in_store?: boolean;
  sale_price?: number;
  store_price?: number | null;
  store_discount_price?: number | null;
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
  images?: string[];
  show_in_store?: boolean;
  description: string;
  sale_price: number;
  store_price?: number | null;
  store_discount_price?: number | null;
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

export interface IPreviewProductImport {
  row: number;
  code: string;
  name: string;
  description: string;
  sale_price: number;
  brand: string;
  category: string;
  stock_type: string;
  min_stock: number;
  max_stock: number;
  show_in_store: boolean;
  store_price: number | null;
  store_discount_price: number | null;
  isValid: boolean;
  errors: string[];
}
