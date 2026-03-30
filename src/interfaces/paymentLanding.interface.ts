import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";
import { paymentLandingMethod } from "../utils/enums/paymentLandingMethod.enum";
import { paymentLandingStatus } from "../utils/enums/paymentLandingStatus.enum";

export interface IPaymentLanding {
  _id: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  company: ICompany;
  system: string;
  plan: string;
  amount: number;
  currency: string;
  method: paymentLandingMethod;
  status: paymentLandingStatus;
  paid_at: Date;
  proof_url: string;
  billing_info: {
    name: string;
    nit: string;
    email: string;
  };
}

export interface PaymentLandingInput {
  company: string;
  system?: string;
  plan: string;
  amount: number;
  currency: string;
  method: string;
  proof_url: string;
  billing_name?: string;
  billing_nit?: string;
  billing_email?: string;
}
