import mongoose, { Schema as MongooseSchema } from "mongoose";

const saleReturnDetailSchema = new mongoose.Schema(
  {
    sale_return: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_return",
      required: true,
    },
    sale_order_detail: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order_detail",
      required: true,
    },
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    quantity: { type: Number, required: true },
    sale_price: { type: Number, required: true },
    subtotal: { type: Number, required: true, default: 0 },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const SaleReturnDetail = mongoose.model(
  "sale_return_detail",
  saleReturnDetailSchema
);
