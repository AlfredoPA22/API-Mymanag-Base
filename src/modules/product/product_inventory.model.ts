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
      default: null,
      required: false,
    },
    product_transfer_detail: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product_transfer_detail",
      default: null,
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    available: {
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
    transferred: {
      type: Number,
      required: true,
      default: 0,
    },
    status: { type: String, default: productInventoryStatus.BORRADOR },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const ProductInventory = mongoose.model(
  "product_inventory",
  productInventorySchema
);
