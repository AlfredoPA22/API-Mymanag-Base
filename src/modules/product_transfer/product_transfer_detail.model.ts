import mongoose, { Schema as MongooseSchema } from "mongoose";

const productTransferDetailSchema = new mongoose.Schema(
  {
    product_transfer: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product_transfer",
      required: true,
    },
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    quantity: { type: Number, required: true },
    serials: [{ type: String }],
    inventory_usage: [
      {
        purchase_order_detail: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "purchase_order_detail",
          default: null,
        },
        quantity: { type: Number, default: 0 },
      },
    ],
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
