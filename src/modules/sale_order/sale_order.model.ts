import mongoose, { Schema as MongooseSchema } from "mongoose";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";

const saleOrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    date: { type: Date, required: true },
    client: {
      type: MongooseSchema.Types.ObjectId,
      ref: "client",
      required: true,
    },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      default: saleOrderStatus.BORRADOR,
    },
    payment_method: {
      type: String,
      required: true,
      default: paymentMethod.CONTADO,
    },
    contado_payment_method: { type: String, required: false },
    is_paid: { type: Boolean, required: true, default: false },
    has_return: { type: Boolean, default: false },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
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

export const SaleOrder = mongoose.model("sale_order", saleOrderSchema);
