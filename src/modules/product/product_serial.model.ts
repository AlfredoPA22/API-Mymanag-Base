import mongoose from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";

const productSerialSchema = new mongoose.Schema(
  {
    serial: { type: String, required: true },
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
    sale_order_detail: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order_detail",
      default: null,
      required: false,
    },
    status: { type: String, default: productSerialStatus.BORRADOR },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const ProductSerial = mongoose.model(
  "product_serial",
  productSerialSchema
);
