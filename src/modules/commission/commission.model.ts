import mongoose, { Schema as MongooseSchema } from "mongoose";
import { commissionStatus } from "../../utils/enums/commissionStatus.enum";

const commissionSchema = new mongoose.Schema(
  {
    sale_order: {
      type: MongooseSchema.Types.ObjectId,
      ref: "sale_order",
      required: true,
    },
    seller: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // % congelado al momento de aprobarse la venta — cambios posteriores al
    // commission_rate del vendedor no afectan comisiones ya generadas.
    rate: { type: Number, required: true },
    // Siempre en la moneda base de la empresa, para poder sumar entre
    // comisiones de ventas en distinta moneda sin mezclar Bs y $.
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(commissionStatus),
      default: commissionStatus.PENDIENTE,
    },
    paid_at: { type: Date, default: null },
    paid_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const Commission = mongoose.model("commission", commissionSchema);
