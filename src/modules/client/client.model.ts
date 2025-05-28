import mongoose, { Schema as MongooseSchema } from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Client = mongoose.model("client", clientSchema);
