import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  is_active: { type: Boolean, default: true },
});

export const Warehouse = mongoose.model("warehouse", warehouseSchema);
