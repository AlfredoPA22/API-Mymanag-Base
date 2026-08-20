import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  AddCashMovementInput,
  CloseCashRegisterInput,
  ICashRegister,
  OpenCashRegisterInput,
} from "../../interfaces/cashRegister.interface";
import { cashRegisterStatus } from "../../utils/enums/cashRegisterStatus.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { salePaymentMethod } from "../../utils/enums/salePaymentMethod";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { CashRegister } from "./cash_register.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { Company } from "../company/company.model";
import { round2 } from "../../utils/money";

// Calcula cuánto efectivo debería haber en caja al momento de leerla: lo que
// había al abrir + lo que entró en efectivo (ventas al contado y cobros de
// crédito) + movimientos manuales, separado por moneda porque una empresa en
// $ puede recibir efectivo tanto en $ como en su moneda alterna (Bs). No se
// guarda en la base de datos — se recalcula cada vez que se lee la caja, así
// siempre refleja el estado real sin arriesgarse a quedar desactualizado.
const computeExpected = async (
  cashRegister: any,
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICashRegister> => {
  const from = cashRegister.opening_date;
  const to = cashRegister.closing_date ?? new Date();

  // Se usa `createdAt` (cuándo se registró en el sistema) y no `date` (la
  // fecha "de negocio" de la venta, que el usuario puede editar) — lo que
  // importa para cuadrar una caja es qué pasó físicamente durante el turno.
  const cashSales = await SaleOrder.find({
    company: companyId,
    status: saleOrderStatus.APROBADO,
    payment_method: paymentMethod.CONTADO,
    contado_payment_method: salePaymentMethod.EFECTIVO,
    createdAt: { $gte: from, $lte: to },
  })
    .select("total currency")
    .lean();

  const cashPayments = await SalePayment.find({
    company: companyId,
    payment_method: salePaymentMethod.EFECTIVO,
    createdAt: { $gte: from, $lte: to },
  })
    .select("amount currency")
    .lean();

  let cash_sales = 0;
  let cash_sales_bs = 0;
  for (const order of cashSales) {
    if ((order as any).currency === "Bs") cash_sales_bs += (order as any).total ?? 0;
    else cash_sales += (order as any).total ?? 0;
  }

  let cash_payments = 0;
  let cash_payments_bs = 0;
  for (const payment of cashPayments) {
    if ((payment as any).currency === "Bs") cash_payments_bs += (payment as any).amount ?? 0;
    else cash_payments += (payment as any).amount ?? 0;
  }

  let movements_net = 0;
  let movements_net_bs = 0;
  for (const movement of cashRegister.movements ?? []) {
    const sign = movement.type === "RETIRO" ? -1 : 1;
    if (movement.currency === "Bs") movements_net_bs += sign * movement.amount;
    else movements_net += sign * movement.amount;
  }

  const expected_amount = round2(
    (cashRegister.opening_amount ?? 0) + cash_sales + cash_payments + movements_net
  );
  const expected_amount_bs = round2(
    (cashRegister.opening_amount_bs ?? 0) + cash_sales_bs + cash_payments_bs + movements_net_bs
  );

  return {
    ...cashRegister,
    cash_sales: round2(cash_sales),
    cash_sales_bs: round2(cash_sales_bs),
    cash_payments: round2(cash_payments),
    cash_payments_bs: round2(cash_payments_bs),
    expected_amount,
    expected_amount_bs,
  };
};

export const findCurrentCashRegister = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICashRegister | null> => {
  const cashRegister = await CashRegister.findOne({
    company: companyId,
    status: cashRegisterStatus.ABIERTA,
  })
    .populate("opened_by")
    .populate("closed_by")
    .populate("movements.created_by")
    .lean<ICashRegister | null>();

  if (!cashRegister) return null;

  return await computeExpected(cashRegister, companyId);
};

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICashRegister[]> => {
  const cashRegisters = await CashRegister.find({ company: companyId })
    .sort({ opening_date: -1 })
    .populate("opened_by")
    .populate("closed_by")
    .populate("movements.created_by")
    .lean<ICashRegister[]>();

  return await Promise.all(
    cashRegisters.map((cashRegister) => computeExpected(cashRegister, companyId))
  );
};

export const openCashRegister = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: OpenCashRegisterInput
): Promise<ICashRegister> => {
  const existingOpen = await CashRegister.findOne({
    company: companyId,
    status: cashRegisterStatus.ABIERTA,
  });

  if (existingOpen) {
    throw new Error("Ya existe una caja abierta para esta empresa");
  }

  if (input.opening_amount < 0) {
    throw new Error("El monto de apertura no puede ser negativo");
  }
  if (input.opening_amount_bs != null && input.opening_amount_bs < 0) {
    throw new Error("El monto de apertura en Bs no puede ser negativo");
  }

  // El findOne de arriba no es atómico: dos solicitudes casi simultáneas
  // (doble click, delay de red) pueden pasar ambas la verificación antes de
  // que cualquiera termine de crear. El índice parcial único de la empresa
  // es quien realmente lo impide — acá se traduce su error de clave
  // duplicada al mismo mensaje amigable en vez de dejarlo salir crudo.
  let newCashRegister;
  try {
    newCashRegister = await CashRegister.create({
      company: companyId,
      opening_amount: input.opening_amount,
      opening_amount_bs: input.opening_amount_bs ?? null,
      opening_date: new Date(),
      opened_by: userId,
      notes: input.notes ?? null,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new Error("Ya existe una caja abierta para esta empresa");
    }
    throw error;
  }

  const cashRegister = await CashRegister.findOne({ _id: newCashRegister._id, company: companyId })
    .populate("opened_by")
    .lean<ICashRegister>();

  return await computeExpected(cashRegister, companyId);
};

export const closeCashRegister = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  cashRegisterId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: CloseCashRegisterInput
): Promise<ICashRegister> => {
  const foundCashRegister = await CashRegister.findOne({
    _id: cashRegisterId,
    company: companyId,
    status: cashRegisterStatus.ABIERTA,
  });

  if (!foundCashRegister) {
    throw new Error("No se encontró una caja abierta con ese id");
  }

  if (input.closing_amount < 0) {
    throw new Error("El monto de cierre no puede ser negativo");
  }
  if (input.closing_amount_bs != null && input.closing_amount_bs < 0) {
    throw new Error("El monto de cierre en Bs no puede ser negativo");
  }

  foundCashRegister.status = cashRegisterStatus.CERRADA;
  foundCashRegister.closing_amount = input.closing_amount;
  foundCashRegister.closing_amount_bs = input.closing_amount_bs ?? null;
  foundCashRegister.closing_date = new Date();
  foundCashRegister.closed_by = userId as any;
  if (input.notes) foundCashRegister.notes = input.notes;

  await foundCashRegister.save();

  const cashRegister = await CashRegister.findOne({ _id: cashRegisterId, company: companyId })
    .populate("opened_by")
    .populate("closed_by")
    .populate("movements.created_by")
    .lean<ICashRegister>();

  return await computeExpected(cashRegister, companyId);
};

export const addCashMovement = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  cashRegisterId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: AddCashMovementInput
): Promise<ICashRegister> => {
  const foundCashRegister = await CashRegister.findOne({
    _id: cashRegisterId,
    company: companyId,
    status: cashRegisterStatus.ABIERTA,
  });

  if (!foundCashRegister) {
    throw new Error("No se encontró una caja abierta con ese id");
  }

  if (input.amount <= 0) {
    throw new Error("El monto del movimiento debe ser mayor a cero");
  }
  if (!input.description?.trim()) {
    throw new Error("Describe el motivo del movimiento");
  }

  const company = await Company.findById(companyId).lean();
  if (input.currency === "Bs" && company?.currency !== "$") {
    throw new Error("Esta empresa no maneja movimientos en Bs");
  }

  foundCashRegister.movements.push({
    type: input.type,
    amount: input.amount,
    currency: input.currency === "Bs" ? "Bs" : null,
    description: input.description.trim(),
    date: new Date(),
    created_by: userId,
  } as any);

  await foundCashRegister.save();

  const cashRegister = await CashRegister.findOne({ _id: cashRegisterId, company: companyId })
    .populate("opened_by")
    .populate("closed_by")
    .populate("movements.created_by")
    .lean<ICashRegister>();

  return await computeExpected(cashRegister, companyId);
};
