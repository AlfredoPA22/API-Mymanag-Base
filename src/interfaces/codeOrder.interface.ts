import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";

export interface ICodeOrder {
  _id: MongooseTypes.ObjectId;
  code: string;
  sequence: string;
}

export interface CodeOrderInput {
  code?: string;
}
