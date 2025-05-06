import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "./product.interface";
import { IProductTransferDetail } from "./productTransferDetail.interface";
import { IPurchaseOrderDetail } from "./purchaseOrderDetail.interface";
import { IWarehouse } from "./warehouse.interface";


export interface IProductInventory {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: IProduct;
  warehouse: IWarehouse;
  purchase_order_detail: IPurchaseOrderDetail;
  product_transfer_detail: IProductTransferDetail;
  quantity: number;
  available: number;
  reserved: number;
  sold: number;
  transferred: number;
  status: string;
}
