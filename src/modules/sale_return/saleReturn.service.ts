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
import { SalePayment } from "../sale_payment/sale_payment.model";
import { SaleReturn } from "./sale_return.model";
import { SaleReturnDetail } from "./sale_return_detail.model";

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
    if (item.quantity > detail.quantity) {
      throw new Error(
        `La cantidad a devolver (${item.quantity}) supera la vendida (${detail.quantity}) para ${(detail.product as any).name}`
      );
    }
  }

  // 5. Revertir stock por cada item seleccionado
  let returnTotal = 0;

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

    const itemSubtotal = parseFloat((detail.sale_price * returnQty).toFixed(2));
    returnTotal += itemSubtotal;
  }

  // 6. Actualizar los detalles de la orden de venta y el total
  for (const item of validItems) {
    const detail = detailMap.get(item.saleOrderDetailId)!;
    if (item.quantity >= detail.quantity) {
      // Devolución total del ítem: eliminar el detalle
      await SaleOrderDetail.deleteOne({ _id: detail._id });
    } else {
      // Devolución parcial: reducir cantidad y subtotal
      const itemReturned = parseFloat((detail.sale_price * item.quantity).toFixed(2));
      await SaleOrderDetail.updateOne(
        { _id: detail._id },
        { $inc: { quantity: -item.quantity, subtotal: -itemReturned } }
      );
    }
  }

  // Marcar la orden de venta como con devolución, reducir el total y cancelar si queda en 0
  const newTotal = parseFloat((saleOrder.total - returnTotal).toFixed(2));
  const setFields: Record<string, any> = { has_return: true };

  if (newTotal <= 0) {
    setFields.status = saleOrderStatus.DEVUELTO;
    setFields.total = 0;
    setFields.is_paid = true; // total en 0, no hay nada que pagar
  } else if (saleOrder.payment_method === paymentMethod.CREDITO) {
    // Recalcular is_paid según pagos reales vs nuevo total
    const paymentAgg = await SalePayment.aggregate([
      { $match: { sale_order: saleOrder._id, company: companyId } },
      { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
    ]);
    const totalPaid = paymentAgg[0]?.totalPaid || 0;
    setFields.is_paid = totalPaid >= newTotal;
  }

  await SaleOrder.updateOne(
    { _id: saleOrderId, company: companyId },
    {
      $set: setFields,
      ...(newTotal > 0 ? { $inc: { total: -parseFloat(returnTotal.toFixed(2)) } } : {}),
    }
  );

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
      const itemSubtotal = parseFloat((detail.sale_price * item.quantity).toFixed(2));

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
