import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  count_product: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
});

export const Brand = mongoose.model("brand", brandSchema);
