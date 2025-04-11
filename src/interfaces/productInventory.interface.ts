import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "./product.interface";
import { IPurchaseOrderDetail } from "./purchaseOrderDetail.interface";
import { IWarehouse } from "./warehouse.interface";

// export interface ProductInventoryInput {
//   serial: string;
//   product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
//   purchase_order_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
//   warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
//   sale_order_detail?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
// }

export interface IProductInventory {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: IProduct;
  warehouse: IWarehouse;
  purchase_order_detail: IPurchaseOrderDetail;
  quantity: number;
  reserved: number;
  sold: number;
  status: string;
}
