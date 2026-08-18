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

// Único guardarraíl real contra duplicados: la validación en
// createProductSerial (product.service.ts) es un find-then-create no
// atómico — dos solicitudes casi simultáneas (doble submit, dos pestañas,
// una extensión del navegador reenviando el evento) pueden pasar ambas la
// verificación antes de que cualquiera termine de crear. Solo la base de
// datos puede rechazar eso de forma atómica.
productSerialSchema.index({ company: 1, serial: 1 }, { unique: true });

export const ProductSerial = mongoose.model(
  "product_serial",
  productSerialSchema
);
