import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { productTransferStatus } from "../utils/enums/productTransferStatus.enum";
import { IUser } from "./user.interface";
import { IWarehouse } from "./warehouse.interface";

export interface IProductTransfer {
  _id: MongooseTypes.ObjectId;
  code: string;
  date: Date;
  origin_warehouse: IWarehouse;
  destination_warehouse: IWarehouse;
  status: productTransferStatus;
  created_by: IUser;
}

export interface ProductTransferInput {
  date: Date;
  origin_warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  destination_warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
}
