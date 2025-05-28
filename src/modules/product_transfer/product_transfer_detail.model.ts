import mongoose, { Schema as MongooseSchema } from "mongoose";

const productTransferDetailSchema = new mongoose.Schema(
  {
    product_transfer: {
      type: MongooseSchema.Types.ObjectId,
      ref: "transfer_order",
      required: true,
    },
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    quantity: { type: Number, required: true },
    serials: [{ type: String }],
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const ProductTransferDetail = mongoose.model(
  "product_transfer_detail",
  productTransferDetailSchema
);
