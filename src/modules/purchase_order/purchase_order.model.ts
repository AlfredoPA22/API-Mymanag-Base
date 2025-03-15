import mongoose, { Schema as MongooseSchema } from "mongoose";
import { purchaseOrderStatus } from "../../utils/enums/purchaseOrderStatus.enum";

const purchaseOrderSchema = new mongoose.Schema({
  code: { type: String, required: true },
  date: { type: Date, required: true },
  provider: {
    type: MongooseSchema.Types.ObjectId,
    ref: "provider",
    required: true,
  },
  total: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    required: true,
    default: purchaseOrderStatus.BORRADOR,
  },
});

export const PurchaseOrder = mongoose.model(
  "purchase_order",
  purchaseOrderSchema
);
