import { Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";

export interface IProvider {
  _id: MongooseTypes.ObjectId;
  name: string;
  address: string;
  phoneNumber: string;
  company: ICompany;
}

export interface ProviderInput {
  name: string;
  address?: string;
  phoneNumber?: string;
}

export interface UpdateProviderInput {
  name: string;
  address: string;
  phoneNumber: string;
}
