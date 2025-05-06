import mongoose, { Schema as MongooseSchema } from "mongoose";
import { productTransferStatus } from "../../utils/enums/productTransferStatus.enum";

const productTransferSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    date: { type: Date, required: true },
    origin_warehouse: {
      type: MongooseSchema.Types.ObjectId,
      ref: "warehouse",
      required: true,
    },
    destination_warehouse: {
      type: MongooseSchema.Types.ObjectId,
      ref: "warehouse",
      required: true,
    },
    status: {
      type: String,
      default: productTransferStatus.BORRADOR,
      required: true,
    },
    created_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

export const ProductTransfer = mongoose.model(
  "product_transfer",
  productTransferSchema
);
