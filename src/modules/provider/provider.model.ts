import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Provider = mongoose.model("provider", providerSchema);
