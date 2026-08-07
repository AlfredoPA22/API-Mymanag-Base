import mongoose, { Schema as MongooseSchema } from "mongoose";

const saleOrderDetailSchema = new mongoose.Schema(
  {
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
      required: true,
    },
    // Sin producto (null) cuando es un ítem sin inventario — algo que el
    // vendedor consiguió de un tercero para esta venta puntual y no maneja
    // como stock propio. En ese caso `custom_name`/`custom_cost` lo describen.
    product: {
      type: MongooseSchema.Types.ObjectId,
      ref: "product",
      required: false,
      default: null,
    },
    custom_name: { type: String, required: false, default: null },
    custom_cost: { type: Number, required: false, default: null },
    inventory_usage: [
      {
        warehouse: { type: MongooseSchema.Types.ObjectId, ref: "warehouse" },
        purchase_order_detail: {
          type: MongooseSchema.Types.ObjectId,
          ref: "purchase_order_detail",
        },
        quantity: Number,
      },
    ],
    sale_price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    serials: { type: Number, required: true, default: 0 },
    discount_type: { type: String, required: false, default: null },
    discount_value: { type: Number, required: false, default: 0 },
    discount_amount: { type: Number, required: false, default: 0 },
    subtotal: { type: Number, required: true, default: 0 },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const SaleOrderDetail = mongoose.model(
  "sale_order_detail",
  saleOrderDetailSchema
);
