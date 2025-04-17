import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Client = mongoose.model("client", clientSchema);
