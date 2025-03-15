import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  count_product: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
});

export const Category = mongoose.model("category", categorySchema);
