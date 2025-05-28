import mongoose, { Schema as MongooseSchema } from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    count_product: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Brand = mongoose.model("brand", brandSchema);
