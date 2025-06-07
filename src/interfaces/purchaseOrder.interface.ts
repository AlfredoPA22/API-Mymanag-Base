import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { purchaseOrderStatus } from "../utils/enums/purchaseOrderStatus.enum";
import {
  IPurchaseOrderDetail,
  IPurchaseOrderDetailToPDF,
} from "./purchaseOrderDetail.interface";
import { IProvider } from "./provider.interface";
import { IUser } from "./user.interface";
import { ICompany } from "./company.interface";

export interface IPurchaseOrder {
  _id: MongooseTypes.ObjectId;
  code: string;
  date: Date;
  provider: IProvider;
  total: string;
  status: purchaseOrderStatus;
  created_by: IUser;
  company: ICompany;
}

export interface IPurchaseOrderByProduct {
  purchaseOrder: IPurchaseOrder;
  purchaseOrderDetail: IPurchaseOrderDetail;
}

export interface PurchaseOrderInput {
  date?: Date;
  provider: string;
}

export interface IPurchaseOrderToPDF {
  purchaseOrder: IPurchaseOrder;
  purchaseOrderDetail: IPurchaseOrderDetailToPDF[];
}

export interface IPurchaseOrderByYear {
  month: string;
  total: Number;
}

export interface FilterPurchaseOrderInput {
  startDate?: Date;
  endDate?: Date;
  provider?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  status?: string;
}
