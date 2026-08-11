import { Schema, InferSchemaType } from "mongoose";
import { restaurantConnection } from "../db";

const categorySchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    icono: { type: String, trim: true },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type Category = InferSchemaType<typeof categorySchema> & { _id: string };

export default restaurantConnection.model("Category", categorySchema);
