import { Types as MongooseTypes } from "mongoose";
import { saleOrderStatus } from "../utils/enums/saleOrderStatus.enum";
import { IClient } from "./client.interface";
import { IPurchaseOrderDetailToPDF } from "./purchaseOrderDetail.interface";
import { ISaleOrderDetailToPDF } from "./saleOrderDetail.interface";

export interface ISaleOrder {
  _id: MongooseTypes.ObjectId;
  code: string;
  client: IClient;
  date: Date;
  total: string;
  status: saleOrderStatus;
}

export interface ISaleOrderByClient {
  saleOrder: ISaleOrder[];
  total: string;
}

export interface SaleOrderInput {
  date: Date;
  client: string;
} 

export interface ISaleOrderToPDF {
  saleOrder: ISaleOrder;
  saleOrderDetail: ISaleOrderDetailToPDF[];
}

export interface ISaleOrderByYear {
  month: string;
  total: Number;
}