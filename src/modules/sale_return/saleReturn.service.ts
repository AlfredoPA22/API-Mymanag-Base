import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { codeType } from "../../utils/enums/orderType.enum";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { updateOrderTotal } from "../sale_order/saleOrder.service";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { SaleReturn } from "./sale_return.model";
import { SaleReturnDetail } from "./sale_return_detail.model";
import { round2 } from "../../utils/money";
import { createNotification } from "../notification/notification.service";
import {
  adjustCommissionForPartialReturn,
  voidCommissionForSaleOrder,
} from "../commission/commission.service";

export interface SaleReturnItem {
  saleOrderDetailId: string;
  quantity: number;
}

export const createSaleReturn = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: string,
  reason: string,
  items: SaleReturnItem[]
) => {
  // 1. Validar que la orden existe y está aprobada
  const saleOrder = await SaleOrder.findOne({ _id: saleOrderId, company: companyId });
  if (!saleOrder) throw new Error("Orden de venta no encontrada");
  if (saleOrder.status !== saleOrderStatus.APROBADO) {
    throw new Error("Solo se pueden devolver órdenes de venta aprobadas");
  }

  // 2. Verificar si ya existe una devolución para esta orden (se podrá agregar a ella)
  const existingReturn = await SaleReturn.findOne({ sale_order: saleOrderId, company: companyId });

  // 3. Validar items: al menos uno con qty > 0
  const validItems = items.filter((i) => i.quantity > 0);
  if (validItems.length === 0) throw new Error("Selecciona al menos un producto con cantidad mayor a 0");

  // 4. Obtener y validar los detalles de la orden
  const allDetails = await SaleOrderDetail.find({
    sale_order: saleOrderId,
    company: companyId,
  }).populate("product");

  const detailMap = new Map(allDetails.map((d) => [d._id.toString(), d]));

  for (const item of validItems) {
    const detail = detailMap.get(item.saleOrderDetailId);
    if (!detail) throw new Error(`Detalle ${item.saleOrderDetailId} no pertenece a esta orden`);
    if (!detail.product) {
      throw new Error(
        `"${(detail as any).custom_name ?? "Este ítem"}" no tiene inventario y no se puede devolver — anula la venta si necesitas revertirlo.`
      );
    }
    if (item.quantity > detail.quantity) {
      throw new Error(
        `La cantidad a devolver (${item.quantity}) supera la vendida (${detail.quantity}) para ${(detail.product as any).name}`
      );
    }
  }

  // 5. Revertir stock por cada item seleccionado
  let returnTotal = 0;
  // Monto realmente devuelto por cada línea, prorrateado sobre su subtotal
  // NETO (ya con el descuento de esa línea aplicado) — no sobre el precio
  // bruto. Antes se usaba `sale_price * cantidad`, que ignoraba cualquier
  // descuento de línea y sobreestimaba lo devuelto/reembolsado.
  const itemAmounts = new Map<string, number>();

  for (const item of validItems) {
    const detail = detailMap.get(item.saleOrderDetailId)!;
    const returnQty = item.quantity;
    const detailProduct = detail.product as any;

    // Restaurar stock global del producto
    const product = await Product.findOneAndUpdate(
      { _id: detailProduct._id, company: companyId },
      { $inc: { stock: returnQty } },
      { new: true }
    );
    if (product && product.stock > 0 && product.status === productStatus.SIN_STOCK) {
      await Product.updateOne({ _id: product._id }, { status: productStatus.DISPONIBLE });
    }

    if (detailProduct.stock_type === stockType.SERIALIZADO) {
      // Liberar los primeros N seriales vendidos de este detalle
      const serials = await ProductSerial.find({
        company: companyId,
        sale_order_detail: detail._id,
        status: productSerialStatus.VENDIDO,
      }).limit(returnQty);

      await ProductSerial.updateMany(
        { _id: { $in: serials.map((s) => s._id) } },
        { $set: { status: productSerialStatus.DISPONIBLE, sale_order_detail: null } }
      );
    }

    if (
      detailProduct.stock_type === stockType.INDIVIDUAL &&
      detail.inventory_usage &&
      Array.isArray(detail.inventory_usage) &&
      detail.inventory_usage.length > 0
    ) {
      let qtyToRestore = returnQty;

      for (const usage of detail.inventory_usage as any[]) {
        if (qtyToRestore <= 0) break;
        const restoreFromThis = Math.min(usage.quantity, qtyToRestore);
        if (restoreFromThis <= 0) continue;

        const inventory = await ProductInventory.findOne({
          company: companyId,
          product: detailProduct._id,
          warehouse: usage.warehouse,
          purchase_order_detail: usage.purchase_order_detail,
        });

        if (inventory) {
          inventory.sold -= restoreFromThis;
          if (inventory.sold < 0) inventory.sold = 0;
          inventory.available += restoreFromThis;
          if (inventory.available > 0) inventory.status = productInventoryStatus.DISPONIBLE;
          await inventory.save();
        }
        qtyToRestore -= restoreFromThis;
      }
    }

    const unitNetPrice = detail.quantity > 0 ? detail.subtotal / detail.quantity : detail.sale_price;
    const itemAmount = round2(unitNetPrice * returnQty);
    itemAmounts.set(item.saleOrderDetailId, itemAmount);
    returnTotal += itemAmount;
  }
  returnTotal = round2(returnTotal);

  // 6. Actualizar los detalles de la orden de venta y el total
  for (const item of validItems) {
    const detail = detailMap.get(item.saleOrderDetailId)!;
    if (item.quantity >= detail.quantity) {
      // Devolución total del ítem: eliminar el detalle
      await SaleOrderDetail.deleteOne({ _id: detail._id });
    } else {
      // Devolución parcial: reducir cantidad y subtotal (monto neto, no bruto)
      const itemReturned = itemAmounts.get(item.saleOrderDetailId)!;
      await SaleOrderDetail.updateOne(
        { _id: detail._id },
        { $inc: { quantity: -item.quantity, subtotal: -itemReturned } }
      );
    }
  }

  // El total de la nota se recalcula desde cero a partir de los detalles ya
  // actualizados (misma función que usan createDetail/updateSaleOrderDetail),
  // así el descuento de CABECERA se reaplica correctamente sobre la nueva
  // suma de subtotales — antes se restaba `returnTotal` a ciegas del total
  // viejo, lo que ignoraba el descuento de cabecera de la nota.
  let newTotal = round2((await updateOrderTotal(companyId, saleOrderId)) ?? 0);
  const setFields: Record<string, any> = { has_return: true };

  let refundAmount = 0;
  let refundIsQr = false;

  if (saleOrder.payment_method === paymentMethod.CONTADO) {
    if (saleOrder.is_paid) {
      refundAmount = returnTotal;
      refundIsQr = saleOrder.contado_payment_method === "QR";
    }
  } else if (saleOrder.payment_method === paymentMethod.CREDITO) {
    const payments = await SalePayment.find({ sale_order: saleOrder._id, company: companyId });
    const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
    refundAmount = round2(Math.max(totalPaid - Math.max(newTotal, 0), 0));
    refundIsQr = payments.some((p) => p.payment_method === "QR");
    if (newTotal > 0) {
      setFields.is_paid = totalPaid >= newTotal;
    }
  }

  if (newTotal <= 0) {
    setFields.status = saleOrderStatus.DEVUELTO;
    setFields.total = 0;
    setFields.is_paid = true;
  }

  // `updateOrderTotal` ya escribió el total correcto en la BD — acá solo
  // faltan los campos de status/is_paid que dependen de la lógica de
  // devolución (no se vuelve a tocar `total` salvo para forzarlo a 0 cuando
  // la devolución deja la venta en Devuelto).
  await SaleOrder.updateOne(
    { _id: saleOrderId, company: companyId },
    { $set: setFields }
  );

  // La venta quedó totalmente devuelta — si generó una comisión al
  // aprobarse, se anula. Si fue una devolución parcial (todavía queda
  // saldo), la comisión se reajusta proporcionalmente al nuevo total.
  if (setFields.status === saleOrderStatus.DEVUELTO) {
    await voidCommissionForSaleOrder(companyId, saleOrderId, saleOrder.code);
  } else if (newTotal > 0) {
    await adjustCommissionForPartialReturn(
      companyId,
      saleOrderId,
      saleOrder.code,
      newTotal,
      saleOrder.currency,
      saleOrder.exchange_rate
    );
  }

  if (refundAmount > 0) {
    await createNotification(companyId, {
      type: "refund_needed",
      title: "Devolución con saldo a favor del cliente",
      message: refundIsQr
        ? `La devolución en la venta ${saleOrder.code} implica reembolsar ${refundAmount} al cliente, cobrados por QR.`
        : `La devolución en la venta ${saleOrder.code} implica reembolsar ${refundAmount} al cliente.`,
      link: `/ventas/detalle/${saleOrder._id}`,
    });
  }

  // 7. Crear o actualizar el encabezado de la devolución
  let saleReturnDocId: string;

  if (existingReturn) {
    // Agregar al total de la devolución existente
    await SaleReturn.updateOne(
      { _id: existingReturn._id },
      { $inc: { total: parseFloat(returnTotal.toFixed(2)) } }
    );
    saleReturnDocId = existingReturn._id.toString();
  } else {
    const code = await generate(companyId, codeType.SALE_RETURN);
    const newReturn = await SaleReturn.create({
      code,
      sale_order: saleOrderId,
      date: new Date(),
      reason,
      total: parseFloat(returnTotal.toFixed(2)),
      created_by: userId,
      company: companyId,
    });
    await increment(companyId, codeType.SALE_RETURN);
    saleReturnDocId = newReturn._id.toString();
  }

  // 8. Crear o actualizar los detalles de la devolución
  await Promise.all(
    validItems.map(async (item) => {
      const detail = detailMap.get(item.saleOrderDetailId)!;
      const itemSubtotal = itemAmounts.get(item.saleOrderDetailId)!;

      const existingDetail = await SaleReturnDetail.findOne({
        sale_return: saleReturnDocId,
        sale_order_detail: detail._id,
      });

      if (existingDetail) {
        await SaleReturnDetail.updateOne(
          { _id: existingDetail._id },
          { $inc: { quantity: item.quantity, subtotal: itemSubtotal } }
        );
      } else {
        await SaleReturnDetail.create({
          sale_return: saleReturnDocId,
          sale_order_detail: detail._id,
          product: detail.product,
          quantity: item.quantity,
          sale_price: detail.sale_price,
          subtotal: itemSubtotal,
          company: companyId,
        });
      }
    })
  );

  return SaleReturn.findById(saleReturnDocId)
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("created_by")
    .lean();
};

export const findAllSaleReturns = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  return SaleReturn.find({ company: companyId })
    .sort({ createdAt: -1 })
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("created_by")
    .lean();
};

export const findSaleReturn = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleReturnId: string
) => {
  const saleReturn = await SaleReturn.findOne({ _id: saleReturnId, company: companyId })
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("created_by")
    .lean();
  if (!saleReturn) throw new Error("Devolución no encontrada");
  return saleReturn;
};

export const findSaleReturnDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleReturnId: string
) => {
  return SaleReturnDetail.find({ sale_return: saleReturnId, company: companyId })
    .populate("product")
    .lean();
};

export const findSaleReturnBySaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: string
) => {
  return SaleReturn.findOne({ sale_order: saleOrderId, company: companyId })
    .populate({ path: "sale_order", populate: { path: "client" } })
    .populate("created_by")
    .lean();
};
