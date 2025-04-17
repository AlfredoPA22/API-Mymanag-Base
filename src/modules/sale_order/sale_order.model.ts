import mongoose, { Schema as MongooseSchema } from "mongoose";
import { purchaseOrderStatus } from "../../utils/enums/purchaseOrderStatus.enum";

const saleOrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    date: { type: Date, required: true },
    client: {
      type: MongooseSchema.Types.ObjectId,
      ref: "client",
      required: true,
    },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      default: purchaseOrderStatus.BORRADOR,
    },
  },
  { timestamps: true }
);

export const SaleOrder = mongoose.model("sale_order", saleOrderSchema);
