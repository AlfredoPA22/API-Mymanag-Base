import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProductTransfer } from "./productTransfer.interface";
import { IProduct } from "./product.interface";

export interface ITransferInventoryUsage {
  purchase_order_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId | null;
  quantity: number;
}

export interface IProductTransferDetail {
  _id: MongooseTypes.ObjectId;
  product_transfer: IProductTransfer;
  product: IProduct;
  quantity: number;
  serials: string[];
  inventory_usage: ITransferInventoryUsage[];
}

export interface ProductTransferDetailInput {
  product_transfer: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  quantity: number;
}

export interface AddSerialToTransferDetailInput {
  product_transfer_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial: string;
}
