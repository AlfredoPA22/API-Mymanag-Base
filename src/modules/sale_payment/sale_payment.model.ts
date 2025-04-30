import mongoose, { Schema as MongooseSchema } from "mongoose";

const salePaymentSchema = new mongoose.Schema(
  {
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
      required: true,
    },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    payment_method: { type: String, required: true }, // efectivo, transferencia, etc.
    note: { type: String }, // opcional para alguna observación
    created_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

export const SalePayment = mongoose.model("sale_payment", salePaymentSchema);
