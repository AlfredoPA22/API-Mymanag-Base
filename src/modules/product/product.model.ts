import mongoose from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { productStatus } from "../../utils/enums/productStatus.enum";

const productSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
  sale_price: { type: Number, default: 0 },
  last_cost_price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  brand: {
    type: MongooseSchema.Types.ObjectId,
    ref: "brand",
    required: true,
  },
  category: {
    type: MongooseSchema.Types.ObjectId,
    ref: "category",
    required: true,
  },
  stock_type: { type: String, required: true },
  status: { type: String, default: productStatus.SIN_STOCK },
});

export const Product = mongoose.model("product", productSchema);
