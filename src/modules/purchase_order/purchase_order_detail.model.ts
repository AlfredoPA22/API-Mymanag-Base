import mongoose, { Schema as MongooseSchema } from "mongoose";

const purchaseOrderDetailSchema = new mongoose.Schema({
  purchase_order: {
    type: MongooseSchema.Types.ObjectId,
    ref: "purchase_order",
    required: true,
  },
  product: {
    type: MongooseSchema.Types.ObjectId,
    ref: "product",
    required: true,
  },
  purchase_price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  serials: { type: Number, required: true, default: 0 },
  subtotal: { type: Number, required: true, default: 0 },
});

export const PurchaseOrderDetail = mongoose.model(
  "purchase_order_detail",
  purchaseOrderDetailSchema
);
