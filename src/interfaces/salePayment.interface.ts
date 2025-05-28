import { salePaymentMethod } from "../utils/enums/salePaymentMethod";
import { ICompany } from "./company.interface";
import { ISaleOrder } from "./saleOrder.interface";
import { IUser } from "./user.interface";

export interface ISalePayment {
  sale_order: ISaleOrder;
  date: Date;
  amount: number;
  payment_method: salePaymentMethod;
  note: string;
  created_by: IUser;
  company: ICompany;
}

export interface IDetailSalePaymentBySaleOrder {
  sale_order: ISaleOrder;
  total_amount: number;
  total_paid: number;
  total_pending: number;
}

export interface SalePaymentInput {
  sale_order: string;
  date: Date;
  amount: number;
  payment_method: string;
  note?: string;
}
