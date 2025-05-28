import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import {
  IDetailSalePaymentBySaleOrder,
  ISalePayment,
  SalePaymentInput,
} from "../../interfaces/salePayment.interface";
import { IUser } from "../../interfaces/user.interface";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { SaleOrder } from "../sale_order/sale_order.model";
import { User } from "../user/user.model";
import { SalePayment } from "./sale_payment.model";

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
    .populate("sale_order")
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

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    sale_order: saleOrder,
    total_amount: saleOrder.total,
    total_paid: totalPaid,
    total_pending: saleOrder.total - totalPaid,
  };
};

export const createPayment = async (
  companyId: MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  salePaymentInput: SalePaymentInput
) => {
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

  const payments = await SalePayment.aggregate([
    {
      $match: {
        company: new MongooseTypes.ObjectId(companyId),
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
    company: companyId,
  });

  const nuevoTotalPagado = totalPaid + salePaymentInput.amount;
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

  const remainingPayments = await SalePayment.aggregate([
    { $match: { sale_order: foundSaleOrder._id, company: companyId } },
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
