import mongoose, { Schema as MongooseSchema } from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    permission: [{ type: String }],
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Role = mongoose.model("role", roleSchema);
