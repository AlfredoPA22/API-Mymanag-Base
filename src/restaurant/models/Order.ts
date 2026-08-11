import { Schema, InferSchemaType } from "mongoose";
import { restaurantConnection } from "../db";

export const ESTADOS = ["pendiente", "en_preparacion", "listo", "entregado", "cancelado"] as const;
export const TIPOS = ["mesa", "llevar"] as const;
export const METODOS_PAGO = ["efectivo", "qr"] as const;

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1 },
    notas: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    numero: { type: Number, required: true },
    tipo: { type: String, enum: TIPOS, required: true },
    mesa: { type: String, trim: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    estado: { type: String, enum: ESTADOS, default: "pendiente" },
    metodoPago: { type: String, enum: METODOS_PAGO, required: true },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export type Order = InferSchemaType<typeof orderSchema> & { _id: string };

export default restaurantConnection.model("Order", orderSchema);
