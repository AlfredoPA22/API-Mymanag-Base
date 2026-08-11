import { Schema, InferSchemaType } from "mongoose";
import { restaurantConnection } from "../db";

const menuItemSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    precio: { type: Number, required: true, min: 0 },
    categoria: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    disponible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type MenuItem = InferSchemaType<typeof menuItemSchema> & { _id: string };

export default restaurantConnection.model("MenuItem", menuItemSchema);
