import mongoose, { Schema as MongooseSchema } from "mongoose";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { paymentLandingMethod } from "../../utils/enums/paymentLandingMethod.enum";
import { paymentLandingStatus } from "../../utils/enums/paymentLandingStatus.enum";

const paymentLandingSchema = new mongoose.Schema(
  {
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    plan: {
      type: String,
      enum: [companyPlan.BASIC, companyPlan.PRO],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "Bs" },
    method: {
      type: String,
      enum: paymentLandingMethod,
      required: true,
    },
    status: {
      type: String,
      enum: paymentLandingStatus,
      default: paymentLandingStatus.REVIEW,
    },
    paid_at: { type: Date },
    proof_url: { type: String, default: "" },
    billing_info: {
      name: { type: String, default: "" },
      nit: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user_landing",
      required: true,
    },
  },
  { timestamps: true }
);

export const PaymentLanding = mongoose.model(
  "payment_landing",
  paymentLandingSchema
);
