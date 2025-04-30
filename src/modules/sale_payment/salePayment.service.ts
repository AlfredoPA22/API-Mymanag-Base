import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import {
  IDetailSalePaymentBySaleOrder,
  ISalePayment,
  SalePaymentInput,
} from "../../interfaces/salePayment.interface";
import { IUser } from "../../interfaces/user.interface";
import { SaleOrder } from "../sale_order/sale_order.model";
import { User } from "../user/user.model";
import { SalePayment } from "./sale_payment.model";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";

export const findAll = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISalePayment[]> => {
  const foundUser: IUser | null = await User.findById(userId);

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter = foundUser.is_global ? {} : { created_by: userId };

  return await SalePayment.find(filter)
    .sort({ date: -1 })
    .populate("sale_order")
    .populate("created_by")
    .lean<ISalePayment[]>();
};

export const listSalePaymentBySaleOrder = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISalePayment[]> => {
  const foundUser: IUser | null = await User.findById(userId);

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter: any = foundUser.is_global
    ? { sale_order: saleOrderId }
    : { created_by: userId, sale_order: saleOrderId };

  return await SalePayment.find(filter)
    .sort({ date: -1 })
    .populate({
      path: "sale_order",
      populate: {
        path: "client",
      },
    })
    .populate("created_by")
    .lean<ISalePayment[]>();
};

export const detailSalePaymentBySaleOrder = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IDetailSalePaymentBySaleOrder> => {
  const payments = await SalePayment.find({ sale_order: saleOrderId })
    .sort({ date: -1 })
    .populate("sale_order")
    .lean<ISalePayment[]>();

  let saleOrder: ISaleOrder | null = null;

  if (payments.length > 0) {
    saleOrder = payments[0].sale_order as ISaleOrder;
  } else {
    saleOrder = await SaleOrder.findById(saleOrderId).lean<ISaleOrder>();

    if (!saleOrder) {
      throw new Error("Orden de venta no encontrada");
    }
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    sale_order: saleOrder,
    total_amount: saleOrder.total,
    total_paid: totalPaid,
    total_pending: saleOrder.total - totalPaid,
  };
};

export const createPayment = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  salePaymentInput: SalePaymentInput
) => {
  const foundSaleOrder = await SaleOrder.findById(salePaymentInput.sale_order);

  if (!foundSaleOrder) {
    throw new Error("Venta no encontrada");
  }

  if (foundSaleOrder.payment_method !== paymentMethod.CREDITO) {
    throw new Error("No se pueden agregar pagos a esta venta");
  }

  const payments = await SalePayment.aggregate([
    {
      $match: {
        sale_order: new MongooseTypes.ObjectId(salePaymentInput.sale_order),
      },
    },
    {
      $group: {
        _id: "$sale_order",
        totalPaid: { $sum: "$amount" },
      },
    },
  ]);

  const totalPaid = payments[0]?.totalPaid || 0;
  const saldoPendiente = foundSaleOrder.total - totalPaid;

  if (salePaymentInput.amount > saldoPendiente) {
    throw new Error(
      `El monto excede el saldo pendiente. Saldo actual: ${saldoPendiente}`
    );
  }

  const newPayment = await SalePayment.create({
    ...salePaymentInput,
    created_by: userId,
  });

  const nuevoTotalPagado = totalPaid + salePaymentInput.amount;
  foundSaleOrder.is_paid = nuevoTotalPagado >= foundSaleOrder.total;

  await foundSaleOrder.save();

  return newPayment;
};

export const deleteSalePayment = async (
  salePaymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSalePayment = await SalePayment.findById(salePaymentId);

  if (!foundSalePayment) {
    throw new Error("El pago no fue encontrado");
  }

  const foundSaleOrder = await SaleOrder.findById(foundSalePayment.sale_order);

  if (!foundSaleOrder) {
    throw new Error("La orden de venta no fue encontrada");
  }

  const deleteSalePayment = await SalePayment.deleteOne({
    _id: salePaymentId,
  });

  if (deleteSalePayment.deletedCount === 0) {
    return { success: false };
  }

  const remainingPayments = await SalePayment.aggregate([
    { $match: { sale_order: foundSaleOrder._id } },
    { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
  ]);

  const totalPaid = remainingPayments[0]?.totalPaid || 0;
  const isStillPaid = totalPaid >= foundSaleOrder.total;

  foundSaleOrder.is_paid = isStillPaid;
  await foundSaleOrder.save();

  return {
    success: false,
  };
};
