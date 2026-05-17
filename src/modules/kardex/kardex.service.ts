import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { PurchaseOrderDetail } from "../purchase_order/purchase_order_detail.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { SaleReturnDetail } from "../sale_return/sale_return_detail.model";
import { ProductTransferDetail } from "../product_transfer/product_transfer_detail.model";
import { IKardexEntry } from "../../interfaces/kardex.interface";
import { purchaseOrderStatus } from "../../utils/enums/purchaseOrderStatus.enum";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { productTransferStatus } from "../../utils/enums/productTransferStatus.enum";

export const listKardexByProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IKardexEntry[]> => {
  const entries: IKardexEntry[] = [];

  // ── Compras aprobadas ───────────────────────────────────────
  const purchases = await PurchaseOrderDetail.find({
    company: companyId,
    product: productId,
  })
    .populate({
      path: "purchase_order",
      match: { status: purchaseOrderStatus.APROBADO },
      populate: [
        { path: "created_by", select: "user_name" },
        { path: "provider", select: "name" },
      ],
    })
    .lean();

  for (const detail of purchases) {
    const po = (detail as any).purchase_order;
    if (!po) continue;
    entries.push({
      _id: `compra-${detail._id.toString()}`,
      date: new Date(po.date).getTime(),
      type: "Compra",
      reference_code: po.code,
      reference_id: po._id.toString(),
      quantity: (detail as any).quantity,
      unit_price: (detail as any).purchase_price ?? 0,
      subtotal: (detail as any).subtotal ?? 0,
      balance: 0,
      created_by: po.created_by?.user_name ?? "—",
      entity_name: po.provider?.name ?? "—",
    });
  }

  // ── Ventas aprobadas o devueltas ────────────────────────────
  const sales = await SaleOrderDetail.find({
    company: companyId,
    product: productId,
  })
    .populate({
      path: "sale_order",
      match: {
        status: { $in: [saleOrderStatus.APROBADO, saleOrderStatus.DEVUELTO] },
      },
      populate: [
        { path: "created_by", select: "user_name" },
        { path: "client", select: "fullName" },
      ],
    })
    .lean();

  for (const detail of sales) {
    const so = (detail as any).sale_order;
    if (!so) continue;
    entries.push({
      _id: `venta-${detail._id.toString()}`,
      date: new Date(so.date).getTime(),
      type: "Venta",
      reference_code: so.code,
      reference_id: so._id.toString(),
      quantity: -(detail as any).quantity,
      unit_price: (detail as any).sale_price ?? 0,
      subtotal: (detail as any).subtotal ?? 0,
      balance: 0,
      created_by: so.created_by?.user_name ?? "—",
      entity_name: so.client?.fullName ?? "—",
    });
  }

  // ── Devoluciones ────────────────────────────────────────────
  const returns = await SaleReturnDetail.find({
    company: companyId,
    product: productId,
  })
    .populate({
      path: "sale_return",
      populate: { path: "created_by", select: "user_name" },
    })
    .lean();

  for (const detail of returns) {
    const sr = (detail as any).sale_return;
    if (!sr) continue;
    entries.push({
      _id: `devolucion-${detail._id.toString()}`,
      date: new Date(sr.date).getTime(),
      type: "Devolución",
      reference_code: sr.code,
      reference_id: sr._id.toString(),
      quantity: (detail as any).quantity,
      unit_price: (detail as any).sale_price ?? 0,
      subtotal: (detail as any).subtotal ?? 0,
      balance: 0,
      created_by: sr.created_by?.user_name ?? "—",
      entity_name: sr.reason ?? "—",
    });
  }

  // ── Transferencias aprobadas ────────────────────────────────
  const transfers = await ProductTransferDetail.find({
    company: companyId,
    product: productId,
  })
    .populate({
      path: "product_transfer",
      match: { status: productTransferStatus.APROBADO },
      populate: [
        { path: "created_by", select: "user_name" },
        { path: "origin_warehouse", select: "name" },
        { path: "destination_warehouse", select: "name" },
      ],
    })
    .lean();

  for (const detail of transfers) {
    const pt = (detail as any).product_transfer;
    if (!pt) continue;
    const origin = pt.origin_warehouse?.name ?? "?";
    const dest = pt.destination_warehouse?.name ?? "?";
    entries.push({
      _id: `transferencia-${detail._id.toString()}`,
      date: new Date(pt.date).getTime(),
      type: "Transferencia",
      reference_code: pt.code,
      reference_id: pt._id.toString(),
      quantity: (detail as any).quantity,
      unit_price: 0,
      subtotal: 0,
      balance: 0,
      created_by: pt.created_by?.user_name ?? "—",
      entity_name: `${origin} → ${dest}`,
    });
  }

  // ── Calcular saldo acumulado ────────────────────────────────
  entries.sort((a, b) => a.date - b.date);

  let runningBalance = 0;
  for (const entry of entries) {
    if (entry.type !== "Transferencia") {
      runningBalance += entry.quantity;
    }
    entry.balance = runningBalance;
  }

  return entries.reverse();
};
