import { Types as MongooseTypes } from "mongoose";

export interface IClient {
  _id: MongooseTypes.ObjectId;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
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
