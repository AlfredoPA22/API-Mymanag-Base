import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";
import { ISaleOrder } from "./saleOrder.interface";
import { IUser } from "./user.interface";

export interface ICommission {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  sale_order: ISaleOrder;
  seller: IUser;
  company: ICompany;
  rate: number;
  amount: number;
  status: string;
  paid_at?: Date | null;
  paid_by?: IUser | null;
}

export interface CommissionFilterInput {
  sellerId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
}
