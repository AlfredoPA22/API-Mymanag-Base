import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ICommission, CommissionFilterInput } from "../../interfaces/commission.interface";
import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import { IUser } from "../../interfaces/user.interface";
import { commissionStatus } from "../../utils/enums/commissionStatus.enum";
import { round2, toBaseCurrency } from "../../utils/money";
import { User } from "../user/user.model";
import { Commission } from "./commission.model";
import { createNotification } from "../notification/notification.service";

const STORE_ORDER_SOURCE = "tienda_online";

// Se llama justo después de aprobar una venta (ver saleOrder.service.ts).
// No lanza — un problema acá no debe tumbar la aprobación de la venta en sí,
// que es lo realmente crítico del flujo (mismo criterio que ya usa
// qr_payment.service.ts al envolver su propio approveSaleOrder).
export const createCommissionForSaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrder: any
): Promise<void> => {
  try {
    // Las ventas de la tienda online quedan atribuidas a un usuario
    // admin/global cualquiera de la empresa (no hay un vendedor humano real
    // detrás) — se excluyen a propósito para no pagarle comisión al admin
    // por casualidad.
    if (saleOrder.source === STORE_ORDER_SOURCE) return;
    if (!saleOrder.created_by) return;

    const seller = await User.findOne({
      _id: saleOrder.created_by,
      company: companyId,
    }).lean<IUser>();

    if (!seller || !seller.commission_rate || seller.commission_rate <= 0) return;

    const baseAmount = toBaseCurrency(saleOrder.total, saleOrder.currency, saleOrder.exchange_rate);
    const amount = round2((baseAmount * seller.commission_rate) / 100);

    if (amount <= 0) return;

    await Commission.create({
      sale_order: saleOrder._id,
      seller: saleOrder.created_by,
      rate: seller.commission_rate,
      amount,
      status: commissionStatus.PENDIENTE,
      company: companyId,
    });
  } catch (error) {
    console.error(
      `No se pudo generar la comisión de la venta ${saleOrder?.code ?? saleOrder?._id}:`,
      error
    );
  }
};

// Se llama cuando la venta detrás de una comisión deja de existir o de
// tener saldo (devolución total, o se borró la venta) — nunca borra el
// registro, ni siquiera si ya estaba Pagada, para que quede a la vista el
// conflicto y el admin decida el ajuste manual. Si ya estaba Pagada, además
// se notifica: a diferencia de una devolución parcial (que solo ajusta el
// monto), acá la venta entera desaparece — sin este aviso, el admin no tenía
// forma de enterarse de que le pagó una comisión de algo que ya no existe.
export const voidCommissionForSaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId | string,
  saleOrderCode?: string
): Promise<void> => {
  try {
    const affected = await Commission.find({
      company: companyId,
      sale_order: saleOrderId,
      status: { $ne: commissionStatus.ANULADA },
    });

    if (affected.length === 0) return;

    await Commission.updateMany(
      { _id: { $in: affected.map((c) => c._id) } },
      { $set: { status: commissionStatus.ANULADA } }
    );

    const hadPaid = affected.some((c) => c.status === commissionStatus.PAGADA);
    if (hadPaid) {
      await createNotification(companyId, {
        type: "commission_overpaid",
        title: "Comisión pagada de una venta eliminada",
        message: `Se eliminó la venta ${saleOrderCode ?? saleOrderId} después de pagarse su comisión. El registro quedó anulado, pero el pago ya se hizo — revisá el ajuste manualmente.`,
      });
    }
  } catch (error) {
    console.error(`No se pudo anular la comisión de la venta ${saleOrderId}:`, error);
  }
};

// Se llama tras una devolución PARCIAL (la venta sigue Aprobado, solo baja
// su total) — recalcula la comisión con el mismo % congelado pero sobre el
// nuevo total, ya en moneda base. Si la comisión ya se pagó, no se toca un
// pago real retroactivamente: se deja como está y se avisa para que el
// admin decida el ajuste manual (mismo criterio que voidCommissionForSaleOrder).
export const adjustCommissionForPartialReturn = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId | string,
  saleOrderCode: string,
  newTotal: number,
  orderCurrency: string | null | undefined,
  exchangeRate: number | null | undefined
): Promise<void> => {
  try {
    const commission = await Commission.findOne({
      company: companyId,
      sale_order: saleOrderId,
      status: { $ne: commissionStatus.ANULADA },
    });

    if (!commission) return;

    const baseAmount = toBaseCurrency(newTotal, orderCurrency, exchangeRate);
    const adjustedAmount = round2((baseAmount * commission.rate) / 100);

    if (commission.status === commissionStatus.PAGADA) {
      if (adjustedAmount < commission.amount) {
        await createNotification(companyId, {
          type: "commission_overpaid",
          title: "Comisión pagada de más por una devolución parcial",
          message: `La venta ${saleOrderCode} tuvo una devolución parcial después de pagarse su comisión. Se pagaron ${commission.amount}, ahora correspondería ${adjustedAmount} — revisá el ajuste manualmente.`,
        });
      }
      return;
    }

    commission.amount = adjustedAmount;
    await commission.save();
  } catch (error) {
    console.error(`No se pudo reajustar la comisión de la venta ${saleOrderId}:`, error);
  }
};

export const listCommissions = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filter: CommissionFilterInput
): Promise<ICommission[]> => {
  const foundUser = await User.findOne({ _id: userId, company: companyId });
  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const query: any = { company: companyId };

  // Un usuario sin acceso global solo ve sus propias comisiones. Ojo:
  // `sellerId ?? {$exists:true}` fallaría si algún día se manda `sellerId: ""`
  // (string vacío no es null/undefined, así que `??` no lo reemplaza) — se
  // trataría como "buscar seller === ''" y devolvería cero filas en vez de
  // todos los vendedores. Se trata explícitamente el string vacío como "sin filtro".
  const sellerId = filter.sellerId && filter.sellerId.trim() !== "" ? filter.sellerId : undefined;
  query.seller = foundUser.is_global ? sellerId ?? { $exists: true } : userId;

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  return await Commission.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "sale_order",
      populate: { path: "client" },
    })
    .populate("seller")
    .populate("paid_by")
    .lean<ICommission[]>();
};

// Para los documentos de impresión individual (ticket térmico y detallado):
// se abren en una pestaña/ruta propia a partir del id en la URL, así que
// necesitan poder recargar su propio dato en vez de depender del listado ya
// cargado en memoria. Mismo alcance que listCommissions: un usuario sin
// acceso global no puede imprimir la comisión de otro vendedor adivinando el id.
export const findCommission = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  commissionId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICommission> => {
  const foundUser = await User.findOne({ _id: userId, company: companyId });
  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const query: any = { _id: commissionId, company: companyId };
  if (!foundUser.is_global) {
    query.seller = userId;
  }

  const commission = await Commission.findOne(query)
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("seller")
    .populate("paid_by")
    .lean<ICommission>();

  if (!commission) {
    throw new Error("Comisión no encontrada");
  }

  return commission;
};

export const markCommissionPaid = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  commissionId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICommission> => {
  const commission = await Commission.findOne({ _id: commissionId, company: companyId });

  if (!commission) {
    throw new Error("Comisión no encontrada");
  }

  if (commission.status !== commissionStatus.PENDIENTE) {
    throw new Error("Solo se puede marcar como pagada una comisión pendiente");
  }

  commission.status = commissionStatus.PAGADA;
  commission.paid_at = new Date();
  commission.paid_by = userId as any;

  await commission.save();

  const result = await Commission.findById(commission._id)
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("seller")
    .populate("paid_by")
    .lean<ICommission>();

  if (!result) {
    throw new Error("Comisión no encontrada");
  }

  return result;
};

// Vuelve una comisión Pagada a Pendiente — la salida para el caso en que se
// marcó como pagada por error, o para destrabar el borrado de una venta cuya
// comisión ya se había pagado (deleteSaleOrder ahora bloquea ese caso).
export const revertCommissionPayment = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  commissionId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICommission> => {
  const commission = await Commission.findOne({ _id: commissionId, company: companyId });

  if (!commission) {
    throw new Error("Comisión no encontrada");
  }

  if (commission.status !== commissionStatus.PAGADA) {
    throw new Error("Solo se puede anular el pago de una comisión que está Pagada");
  }

  commission.status = commissionStatus.PENDIENTE;
  commission.paid_at = null;
  commission.paid_by = null as any;

  await commission.save();

  const result = await Commission.findById(commission._id)
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("seller")
    .populate("paid_by")
    .lean<ICommission>();

  if (!result) {
    throw new Error("Comisión no encontrada");
  }

  return result;
};
