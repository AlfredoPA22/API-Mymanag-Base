import mongoose, { Schema as MongooseSchema } from "mongoose";
import { cashRegisterStatus } from "../../utils/enums/cashRegisterStatus.enum";

// Un movimiento manual de efectivo durante el turno (retiro para depósito
// bancario, ingreso de vuelto, etc.) — se suma/resta al monto esperado de
// cierre junto con las ventas y cobros en efectivo del turno.
const cashMovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["INGRESO", "RETIRO"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["Bs", null], default: null },
    description: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    created_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { _id: false }
);

const cashRegisterSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      default: cashRegisterStatus.ABIERTA,
    },
    opening_amount: { type: Number, required: true },
    // Solo se usa en empresas que operan en $ y también reciben efectivo en
    // su moneda alterna (Bs) — ver saleOrder.service.ts#create.
    opening_amount_bs: { type: Number, default: null },
    opening_date: { type: Date, required: true, default: Date.now },
    opened_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    closing_amount: { type: Number, default: null },
    closing_amount_bs: { type: Number, default: null },
    closing_date: { type: Date, default: null },
    closed_by: {
      type: MongooseSchema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    notes: { type: String, default: null },
    movements: { type: [cashMovementSchema], default: [] },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const CashRegister = mongoose.model("cash_register", cashRegisterSchema);
