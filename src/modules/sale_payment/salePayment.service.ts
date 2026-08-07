import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import {
  IDetailSalePaymentBySaleOrder,
  ISalePayment,
  SalePaymentInput,
} from "../../interfaces/salePayment.interface";
import { IUser } from "../../interfaces/user.interface";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { SaleOrder } from "../sale_order/sale_order.model";
import { User } from "../user/user.model";
import { SalePayment } from "./sale_payment.model";
import { Company } from "../company/company.model";
import dayjs from "dayjs";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { assertPlanLimit } from "../../utils/assertPlanLimit";
import { round2, toOrderCurrency as toOrderCurrencyRaw } from "../../utils/money";
import { createNotification } from "../notification/notification.service";

// Igual que toOrderCurrency() de utils/money.ts, pero redondeando el
// resultado a 2 decimales — este módulo usa el monto convertido directamente
// en comparaciones/guardado, así que necesita el redondeo aplicado ya aquí.
const toOrderCurrency = (
  amount: number,
  paymentCurrency: string | null | undefined,
  paymentExchangeRate: number | null | undefined,
  fallbackCurrency: string,
  orderCurrency: string
): number => round2(toOrderCurrencyRaw(amount, paymentCurrency, paymentExchangeRate, fallbackCurrency, orderCurrency));

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISalePayment[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter = foundUser.is_global
    ? { company: companyId }
    : { company: companyId, created_by: userId };

  return await SalePayment.find(filter)
    .sort({ date: -1 })
    .populate({
      path: "sale_order",
      populate: {
        path: "client",
      },
    })
    .populate("created_by")
    .populate("company")
    .lean<ISalePayment[]>();
};

export const listSalePaymentBySaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISalePayment[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter: any = foundUser.is_global
    ? { company: companyId, sale_order: saleOrderId }
    : { company: companyId, created_by: userId, sale_order: saleOrderId };

  return await SalePayment.find(filter)
    .sort({ date: -1 })
    .populate({
      path: "sale_order",
      populate: {
        path: "client",
      },
    })
    .populate("created_by")
    .populate("company")
    .lean<ISalePayment[]>();
};

export const detailSalePaymentBySaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IDetailSalePaymentBySaleOrder> => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const payments = await SalePayment.find({
    company: companyId,
    sale_order: saleOrderId,
  })
    .sort({ date: -1 })
    .populate("sale_order")
    .populate("company")
    .lean<ISalePayment[]>();

  let saleOrder: ISaleOrder | null = null;

  if (payments.length > 0) {
    saleOrder = payments[0].sale_order as ISaleOrder;
  } else {
    saleOrder = await SaleOrder.findOne({
      _id: saleOrderId,
      company: companyId,
    }).lean<ISaleOrder>();

    if (!saleOrder) {
      throw new Error("Orden de venta no encontrada");
    }
  }

  const orderCurrency = saleOrder.currency ?? company.currency;
  const totalPaid = round2(
    payments.reduce(
      (sum, payment) =>
        sum +
        toOrderCurrency(payment.amount, payment.currency, payment.exchange_rate, company.currency, orderCurrency),
      0
    )
  );

  return {
    sale_order: saleOrder,
    total_amount: saleOrder.total,
    total_paid: totalPaid,
    total_pending: round2(saleOrder.total - totalPaid),
  };
};

export const createPayment = async (
  companyId: MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  salePaymentInput: SalePaymentInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const inputDate = dayjs(salePaymentInput.date);
  const startOfMonth = inputDate.startOf("month").toDate();
  const endOfMonth = inputDate.endOf("month").toDate();

  const salePaymentCount = await SalePayment.countDocuments({
    company: companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const planLimits = companyPlanLimits[company.plan as companyPlan];

  assertPlanLimit(
    company.plan as companyPlan,
    "pagos",
    salePaymentCount,
    planLimits.maxSalePayment,
    { perMonth: true }
  );

  const foundSaleOrder = await SaleOrder.findOne({
    _id: salePaymentInput.sale_order,
    company: companyId,
  });

  if (!foundSaleOrder) {
    throw new Error("Venta no encontrada");
  }

  if (foundSaleOrder.payment_method !== paymentMethod.CREDITO) {
    throw new Error("No se pueden agregar pagos a esta venta");
  }

  if (foundSaleOrder.status === saleOrderStatus.DEVUELTO) {
    throw new Error("No se pueden agregar pagos a una venta devuelta");
  }

  // Moneda de este pago en particular: por defecto la moneda de la empresa;
  // solo se congela currency/exchange_rate cuando se paga explícitamente en
  // la moneda alterna (Bs, con empresa en $) — un pago en $ no necesita
  // tipo de cambio guardado en ningún lado.
  const orderCurrency = foundSaleOrder.currency ?? company.currency;
  let paymentCurrency: string | null = null;
  let paymentExchangeRate: number | null = null;
  if (salePaymentInput.currency && salePaymentInput.currency !== company.currency) {
    if (company.currency !== "$" || salePaymentInput.currency !== "Bs") {
      throw new Error("Esta empresa no permite registrar pagos en esa moneda.");
    }
    if (!company.exchange_rate || company.exchange_rate <= 0) {
      throw new Error("Configura el tipo de cambio de la empresa en Ajustes antes de registrar un pago en Bs.");
    }
    paymentCurrency = "Bs";
    paymentExchangeRate = company.exchange_rate;
  }

  const existingPayments = await SalePayment.find({
    company: companyId,
    sale_order: salePaymentInput.sale_order,
  }).lean<ISalePayment[]>();

  const totalPaid = round2(
    existingPayments.reduce(
      (sum, payment) =>
        sum +
        toOrderCurrency(payment.amount, payment.currency, payment.exchange_rate, company.currency, orderCurrency),
      0
    )
  );
  const saldoPendiente = round2(foundSaleOrder.total - totalPaid);

  const effectivePaymentCurrency = paymentCurrency ?? company.currency;
  const newPaymentInOrderCurrency = toOrderCurrency(
    salePaymentInput.amount,
    effectivePaymentCurrency,
    paymentExchangeRate ?? company.exchange_rate,
    company.currency,
    orderCurrency
  );

  if (round2(newPaymentInOrderCurrency) > saldoPendiente) {
    throw new Error(
      `El monto excede el saldo pendiente. Saldo actual: ${saldoPendiente} ${orderCurrency}`
    );
  }

  const newPayment = await SalePayment.create({
    sale_order: salePaymentInput.sale_order,
    date: salePaymentInput.date,
    amount: salePaymentInput.amount,
    payment_method: salePaymentInput.payment_method,
    note: salePaymentInput.note,
    currency: paymentCurrency,
    exchange_rate: paymentExchangeRate,
    created_by: userId,
    company: companyId,
  });

  const nuevoTotalPagado = round2(totalPaid + newPaymentInOrderCurrency);
  foundSaleOrder.is_paid = nuevoTotalPagado >= foundSaleOrder.total;

  await foundSaleOrder.save();

  return newPayment;
};

export const deleteSalePayment = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  salePaymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSalePayment = await SalePayment.findOne({
    _id: salePaymentId,
    company: companyId,
  });

  if (!foundSalePayment) {
    throw new Error("El pago no fue encontrado");
  }

  const foundSaleOrder = await SaleOrder.findOne({
    _id: foundSalePayment.sale_order,
    company: companyId,
  });

  if (!foundSaleOrder) {
    throw new Error("La orden de venta no fue encontrada");
  }

  const deleteSalePayment = await SalePayment.deleteOne({
    _id: salePaymentId,
    company: companyId,
  });

  if (deleteSalePayment.deletedCount === 0) {
    return { success: false };
  }

  if (foundSalePayment.payment_method === "QR") {
    await createNotification(companyId, {
      type: "qr_payment_deleted",
      title: "Se eliminó un pago cobrado por QR",
      message: `Se eliminó un abono de ${foundSalePayment.amount} de la venta ${foundSaleOrder.code}, que había sido cobrado por QR. El dinero ya se recibió — si corresponde, gestiona el reembolso.`,
      link: `/ventas/detalle/${foundSaleOrder._id}`,
    });
  }

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const orderCurrency = foundSaleOrder.currency ?? company.currency;
  const remainingPayments = await SalePayment.find({
    sale_order: foundSaleOrder._id,
    company: companyId,
  }).lean<ISalePayment[]>();

  const totalPaid = round2(
    remainingPayments.reduce(
      (sum, payment) =>
        sum +
        toOrderCurrency(payment.amount, payment.currency, payment.exchange_rate, company.currency, orderCurrency),
      0
    )
  );
  const isStillPaid = totalPaid >= foundSaleOrder.total;

  foundSaleOrder.is_paid = isStillPaid;
  await foundSaleOrder.save();

  return {
    success: true,
  };
};
