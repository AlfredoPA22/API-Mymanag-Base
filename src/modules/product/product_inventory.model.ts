import mongoose, { Schema as MongooseSchema } from "mongoose";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";

const productInventorySchema = new mongoose.Schema(
  {
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    warehouse: {
      type: MongooseSchema.Types.ObjectId,
      ref: "warehouse",
      required: true,
    },
    purchase_order_detail: {
      type: MongooseSchema.Types.ObjectId,
      ref: "purchase_order_detail",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    reserved: {
      type: Number,
      required: true,
      default: 0,
    },
    sold: {
      type: Number,
      required: true,
      default: 0,
    },
    status: { type: String, default: productInventoryStatus.BORRADOR },
  },
  { timestamps: true }
);

export const ProductInventory = mongoose.model(
  "product_inventory",
  productInventorySchema
);
