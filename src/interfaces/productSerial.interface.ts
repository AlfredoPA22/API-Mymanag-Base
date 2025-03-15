import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "./product.interface";
import { IPurchaseOrderDetail } from "./purchaseOrderDetail.interface";
import { ISaleOrderDetail } from "./saleOrderDetail.interface";

export interface ProductSerialInput {
  serial?: string;
  product?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  purchase_order_detail?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  sale_order_detail?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}

export interface IProductSerial {
  _id:MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial: string;
  product: IProduct;
  purchase_order_detail: IPurchaseOrderDetail;
  sale_order_detail: ISaleOrderDetail;
  status: string;
}
