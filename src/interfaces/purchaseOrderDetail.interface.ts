import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IPurchaseOrder } from "./purchaseOrder.interface";
import { IProduct } from "./product.interface";
import { IProductSerial } from "./productSerial.interface";

export interface IPurchaseOrderDetail {
  _id: MongooseTypes.ObjectId;
  purchase_order: IPurchaseOrder;
  product: IProduct;
  purchase_price: number;
  quantity: number;
  serials: number;
  subtotal: number;
}

export interface IPurchaseOrderDetailToPDF {
  purchaseOrderDetail: IPurchaseOrderDetail;
  productSerial: IProductSerial[];
}

export interface PurchaseOrderDetailInput {
  purchase_order: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  purchase_price: number;
  quantity: number;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}

export interface UpdatePurchaseOrderDetailInput {
  purchase_price: number;
  quantity: number;
}

export interface AddSerialToPurchaseOrderDetailInput {
  purchase_order_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial: string;
  warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}
