import { Types as MongooseTypes } from "mongoose";

export interface IClient {
  _id: MongooseTypes.ObjectId;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface ClientInput {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface UpdateClientInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
