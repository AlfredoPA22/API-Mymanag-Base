import { Types as MongooseTypes } from "mongoose";
import { ICompany } from "./company.interface";

export interface IClient {
  _id: MongooseTypes.ObjectId;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  company: ICompany;
}

export interface ClientInput {
  fullName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

export interface UpdateClientInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
}
