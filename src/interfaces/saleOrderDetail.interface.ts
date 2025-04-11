import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IPurchaseOrder } from "./purchaseOrder.interface";
import { IProduct } from "./product.interface";
import { ISaleOrder } from "./saleOrder.interface";
import { IProductSerial } from "./productSerial.interface";
import { IWarehouse } from "./warehouse.interface";
import { IPurchaseOrderDetail } from "./purchaseOrderDetail.interface";

export interface IInventoryUsage {
  warehouse: IWarehouse | null;
  purchase_order_detail: IPurchaseOrderDetail | null;
  quantity: number | null;
}

export interface ISaleOrderDetail {
  _id: MongooseTypes.ObjectId;
  sale_order: ISaleOrder;
  product: IProduct;
  sale_price: number;
  quantity: number;
  serials: number;
  inventory_usage: IInventoryUsage[];
  subtotal: number;
}

export interface SaleOrderDetailInput {
  sale_order: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  sale_price: number;
  quantity: number;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  inventory_usage?: {
    warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
    purchase_order_detail:
      | MongooseSchema.Types.ObjectId
      | MongooseTypes.ObjectId;
    quantity: number;
  }[];
}

export interface UpdateSaleOrderDetailInput {
  sale_price: number;
  quantity: number;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  inventory_usage?: {
    warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
    purchase_order_detail:
      | MongooseSchema.Types.ObjectId
      | MongooseTypes.ObjectId;
    quantity: number;
  }[];
}

export interface AddSerialToSaleOrderDetailInput {
  sale_order_detail?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial?: string;
}

export interface ISaleOrderDetailToPDF {
  saleOrderDetail: ISaleOrderDetail;
  productSerial: IProductSerial[];
}
