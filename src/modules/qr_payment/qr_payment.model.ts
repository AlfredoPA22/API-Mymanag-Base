import mongoose, { Schema as MongooseSchema } from "mongoose";

const qrPaymentSchema = new mongoose.Schema(
  {
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
    },
    payment_landing: {
      type: MongooseSchema.Types.ObjectId,
      ref: "payment_landing",
    },
    created_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
    },
    client: {
      type: MongooseSchema.Types.ObjectId,
      ref: "client",
    },
    type: {
      type: String,
      enum: ["venta_contado", "abono_credito", "landing_subscription"],
      required: true,
    },
    transactionId: { type: String, required: true, unique: true },
    referenceId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "Bs" },
    amount_bob: { type: Number },
    exchange_rate: { type: Number },
    status: { type: String, default: "pending_transaction" },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const QrPayment = mongoose.model("qr_payment", qrPaymentSchema);
