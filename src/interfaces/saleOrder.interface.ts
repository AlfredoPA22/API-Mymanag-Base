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
import { IWarehouse } from "./warehouse.interface";

export interface ISaleOrder {
  _id: MongooseTypes.ObjectId;
  code: string;
  client: IClient;
  date: Date;
  total: number;
  status: saleOrderStatus;
  payment_method: paymentMethod;
  contado_payment_method?: string;
  is_paid: boolean;
  created_by: IUser;
  company: ICompany;
  discount_type?: string | null;
  discount_value?: number;
  discount_amount?: number;
  source: string;
  payment_reminder_sent_at?: Date | null;
  currency?: string | null;
  exchange_rate?: number | null;
  // Almacén único de la nota, elegido al crearla. Null en notas viejas
  // (previas a este campo), que siguen con almacén por línea.
  warehouse?: IWarehouse | null;
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
  contado_payment_method?: string;
  source?: string;
  currency?: string;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId | string;
}

export interface IQrPaymentInfo {
  amount: number;
  currency: string;
  amount_bob?: number;
  exchange_rate?: number;
}

export interface ISaleOrderToPDF {
  saleOrder: ISaleOrder;
  saleOrderDetail: ISaleOrderDetailToPDF[];
  qr_payment_info?: IQrPaymentInfo | null;
}

export interface ISalesReportByClient {
  client: string;
  total: Number;
}

export interface ISalesReportBySeller {
  seller: string;
  total: Number;
}

export interface ISalesReportByCategory {
  category: string;
  total: Number;
}

export interface ISalesReportByProduct {
  product: string;
  total: Number;
}

export interface IReportMonthlySales {
  month: string;
  total: Number;
}

export interface FilterSaleOrderInput {
  startDate?: Date;
  endDate?: Date;
  client?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  status?: string;
}

export interface IStoreOrderStatsProduct {
  product: string;
  quantity: Number;
  total: Number;
}

export interface IStoreOrderStats {
  totalOrders: Number;
  pendingOrders: Number;
  approvedOrders: Number;
  totalRevenue: Number;
  averageTicket: Number;
  topProducts: IStoreOrderStatsProduct[];
}
