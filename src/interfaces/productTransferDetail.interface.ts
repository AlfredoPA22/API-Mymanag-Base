import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProductTransfer } from "./productTransfer.interface";
import { IProduct } from "./product.interface";

export interface IProductTransferDetail {
  _id: MongooseTypes.ObjectId;
  product_transfer: IProductTransfer;
  product: IProduct;
  quantity: number;
  serials: string[];
}

export interface ProductTransferDetailInput {
  product_transfer: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  quantity: number;
  serials: string[];
}
