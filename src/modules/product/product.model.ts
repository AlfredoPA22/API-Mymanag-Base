import mongoose from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { productStatus } from "../../utils/enums/productStatus.enum";

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    show_in_store: { type: Boolean, default: true },
    sale_price: { type: Number, default: 0 },
    // Piso opcional bajo el cual no se puede vender sin el permiso
    // SELL_BELOW_MIN_PRICE — si es null, el propio sale_price actúa como
    // mínimo (ver assertPriceAboveMinimum en saleOrder.service.ts).
    min_sale_price: { type: Number, default: null },
    store_price: { type: Number, default: null },
    store_discount_price: { type: Number, default: null },
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
    min_stock: { type: Number, required: true },
    max_stock: { type: Number, required: true },
    status: { type: String, default: productStatus.SIN_STOCK },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("product", productSchema);
