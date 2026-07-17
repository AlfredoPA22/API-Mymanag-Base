import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";

export interface INotification {
  _id: MongooseTypes.ObjectId;
  company: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  link?: string;
}
