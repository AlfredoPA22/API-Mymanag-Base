import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IPurchaseOrder } from "./purchaseOrder.interface";
import { IProduct } from "./product.interface";
import { ISaleOrder } from "./saleOrder.interface";
import { IProductSerial } from "./productSerial.interface";

export interface ISaleOrderDetail {
  _id: MongooseTypes.ObjectId;
  sale_order: ISaleOrder;
  product: IProduct;
  sale_price: number;
  quantity: number;
  serials: number;
  subtotal: number;
}

export interface SaleOrderDetailInput {
  sale_order?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  sale_price?: number;
  quantity?: number;
}

export interface UpdateSaleOrderDetailInput {
  sale_price: number;
  quantity: number;
}

export interface AddSerialToSaleOrderDetailInput {
  sale_order_detail?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial?: string;
}

export interface ISaleOrderDetailToPDF {
  saleOrderDetail: ISaleOrderDetail;
  productSerial: IProductSerial[];
}