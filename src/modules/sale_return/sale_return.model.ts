import mongoose, { Schema as MongooseSchema } from "mongoose";

const saleReturnSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
      required: true,
    },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    total: { type: Number, required: true, default: 0 },
    created_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const SaleReturn = mongoose.model("sale_return", saleReturnSchema);
