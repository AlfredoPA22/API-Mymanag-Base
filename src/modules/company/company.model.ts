import mongoose from "mongoose";

import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyStatus } from "../../utils/enums/companyStatus.enum";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    legal_name: { type: String, default: "" },
    nit: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    image: { type: String, default: "" },
    currency: { type: String, default: "Bs" },
    plan: {
      type: String,
      enum: companyPlan,
      default: companyPlan.FREE,
    },
    status: {
      type: String,
      enum: companyStatus,
      default: companyStatus.PENDING,
    },
    trial_expires_at: { type: Date },
    subscription_expires_at: { type: Date },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user_landing",
      required: true,
    },
    notified_before_expiration: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Company = mongoose.model("company", companySchema);
