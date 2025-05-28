import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { companyPlan } from "../utils/enums/companyPlan.enum";
import { companyStatus } from "../utils/enums/companyStatus.enum";
import { IPaymentLanding } from "./paymentLanding.interface";

export interface ICompanyWithPayment extends ICompany {
  latest_payment?: IPaymentLanding | null;
}

export interface ICompany {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  name: string;
  legal_name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  image: string;
  currency: string;
  plan: companyPlan;
  status: companyStatus;
  trial_expires_at: Date;
  subscription_expires_at: Date;
}

export interface CompanyInput {
  name: string;
  legal_name?: string;
  nit?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  plan?: string;
}
