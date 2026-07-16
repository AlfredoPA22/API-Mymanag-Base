import mongoose, { Schema as MongooseSchema } from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    // Cuenta de cliente para la tienda online (opcional; clientes creados por staff no la tienen)
    password: { type: String, select: false },
    cart_items: {
      type: [
        {
          product: { type: MongooseSchema.Types.ObjectId, ref: "product" },
          quantity: { type: Number },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const Client = mongoose.model("client", clientSchema);
