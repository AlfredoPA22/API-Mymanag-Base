import mongoose from "mongoose";

import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { systemType } from "../../utils/enums/systemType.enum";

const subscriptionSchema = new mongoose.Schema(
  {
    system: { type: String, enum: Object.values(systemType), required: true },
    plan: { type: String, enum: Object.values(companyPlan), default: companyPlan.FREE },
    status: { type: String, enum: Object.values(companyStatus), default: companyStatus.PENDING },
    trial_expires_at: { type: Date, default: null },
    subscription_expires_at: { type: Date, default: null },
    notified_before_expiration: { type: Boolean, default: false },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    legal_name: { type: String, default: "" },
    nit: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    image: { type: String, default: "" },
    currency: { type: String, default: "Bs" },
    // Legacy fields (kept for MyManag backward compatibility)
    plan: {
      type: String,
      enum: Object.values(companyPlan),
      default: companyPlan.FREE,
    },
    status: {
      type: String,
      enum: Object.values(companyStatus),
      default: companyStatus.PENDING,
    },
    trial_expires_at: { type: Date },
    subscription_expires_at: { type: Date },
    notified_before_expiration: { type: Boolean, default: false },
    // Multi-system subscriptions
    subscriptions: { type: [subscriptionSchema], default: [] },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user_landing",
      required: true,
    },
  },
  { timestamps: true }
);

export const Company = mongoose.model("company", companySchema);
