import { Types as MongooseTypes } from "mongoose";

export interface IProvider {
  _id: MongooseTypes.ObjectId;
  name: string;
  address: string;
  phoneNumber: string;
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
