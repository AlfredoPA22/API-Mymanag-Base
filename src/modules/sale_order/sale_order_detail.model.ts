import mongoose, { Schema as MongooseSchema } from "mongoose";

const saleOrderDetailSchema = new mongoose.Schema(
  {
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
      required: true,
    },
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    inventory_usage: [
      {
        warehouse: { type: MongooseSchema.Types.ObjectId, ref: "warehouse" },
        purchase_order_detail: {
          type: MongooseSchema.Types.ObjectId,
          ref: "purchase_order_detail",
        },
        quantity: Number,
      },
    ],
    sale_price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    serials: { type: Number, required: true, default: 0 },
    subtotal: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const SaleOrderDetail = mongoose.model(
  "sale_order_detail",
  saleOrderDetailSchema
);
