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
    // Moneda en la que se realizó ESTE pago en particular (independiente de
    // la moneda de la venta) — solo se guarda cuando el pago es en Bs con
    // una empresa configurada en $; si es en $ queda null (no hace falta
    // tipo de cambio para un pago que ya está en la moneda base).
    currency: { type: String, enum: ["Bs", null], default: null },
    exchange_rate: { type: Number, default: null },
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

export const SalePayment = mongoose.model("sale_payment", salePaymentSchema);
