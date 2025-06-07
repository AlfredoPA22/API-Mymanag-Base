import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { saleOrderStatus } from "../utils/enums/saleOrderStatus.enum";
import { IClient } from "./client.interface";
import {
  ISaleOrderDetail,
  ISaleOrderDetailToPDF,
} from "./saleOrderDetail.interface";
import { IUser } from "./user.interface";
import { paymentMethod } from "../utils/enums/saleOrderPaymentMethod";
import { ICompany } from "./company.interface";

export interface ISaleOrder {
  _id: MongooseTypes.ObjectId;
  code: string;
  client: IClient;
  date: Date;
  total: number;
  status: saleOrderStatus;
  payment_method: paymentMethod;
  is_paid: boolean;
  created_by: IUser;
  company: ICompany;
}

export interface ISaleOrderByClient {
  saleOrder: ISaleOrder[];
  total: string;
}

export interface ISaleOrderByProduct {
  saleOrder: ISaleOrder;
  saleOrderDetail: ISaleOrderDetail;
}

export interface SaleOrderInput {
  date: Date;
  client: string;
  payment_method: string;
}

export interface ISaleOrderToPDF {
  saleOrder: ISaleOrder;
  saleOrderDetail: ISaleOrderDetailToPDF[];
}

export interface ISalesReportByClient {
  client: string;
  total: Number;
}

export interface ISalesReportByCategory {
  category: string;
  total: Number;
}

export interface FilterSaleOrderInput {
  startDate?: Date;
  endDate?: Date;
  client?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  status?: string;
}
