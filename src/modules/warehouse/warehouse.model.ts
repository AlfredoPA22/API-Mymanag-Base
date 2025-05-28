import mongoose, { Schema as MongooseSchema } from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model("warehouse", warehouseSchema);
