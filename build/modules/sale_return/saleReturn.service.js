"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSaleReturnBySaleOrder = exports.findSaleReturnDetail = exports.findSaleReturn = exports.findAllSaleReturns = exports.createSaleReturn = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const productInventoryStatus_enum_1 = require("../../utils/enums/productInventoryStatus.enum");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const sale_order_detail_model_1 = require("../sale_order/sale_order_detail.model");
const sale_payment_model_1 = require("../sale_payment/sale_payment.model");
const sale_return_model_1 = require("./sale_return.model");
const sale_return_detail_model_1 = require("./sale_return_detail.model");
const money_1 = require("../../utils/money");
const notification_service_1 = require("../notification/notification.service");
const createSaleReturn = async (companyId, userId, saleOrderId, reason, items) => {
    // 1. Validar que la orden existe y está aprobada
    const saleOrder = await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId });
    if (!saleOrder)
        throw new Error("Orden de venta no encontrada");
    if (saleOrder.status !== saleOrderStatus_enum_1.saleOrderStatus.APROBADO) {
        throw new Error("Solo se pueden devolver órdenes de venta aprobadas");
    }
    // 2. Verificar si ya existe una devolución para esta orden (se podrá agregar a ella)
    const existingReturn = await sale_return_model_1.SaleReturn.findOne({ sale_order: saleOrderId, company: companyId });
    // 3. Validar items: al menos uno con qty > 0
    const validItems = items.filter((i) => i.quantity > 0);
    if (validItems.length === 0)
        throw new Error("Selecciona al menos un producto con cantidad mayor a 0");
    // 4. Obtener y validar los detalles de la orden
    const allDetails = await sale_order_detail_model_1.SaleOrderDetail.find({
        sale_order: saleOrderId,
        company: companyId,
    }).populate("product");
    const detailMap = new Map(allDetails.map((d) => [d._id.toString(), d]));
    for (const item of validItems) {
        const detail = detailMap.get(item.saleOrderDetailId);
        if (!detail)
            throw new Error(`Detalle ${item.saleOrderDetailId} no pertenece a esta orden`);
        if (!detail.product) {
            throw new Error(`"${detail.custom_name ?? "Este ítem"}" no tiene inventario y no se puede devolver — anula la venta si necesitas revertirlo.`);
        }
        if (item.quantity > detail.quantity) {
            throw new Error(`La cantidad a devolver (${item.quantity}) supera la vendida (${detail.quantity}) para ${detail.product.name}`);
        }
    }
    // 5. Revertir stock por cada item seleccionado
    let returnTotal = 0;
    for (const item of validItems) {
        const detail = detailMap.get(item.saleOrderDetailId);
        const returnQty = item.quantity;
        const detailProduct = detail.product;
        // Restaurar stock global del producto
        const product = await product_model_1.Product.findOneAndUpdate({ _id: detailProduct._id, company: companyId }, { $inc: { stock: returnQty } }, { new: true });
        if (product && product.stock > 0 && product.status === productStatus_enum_1.productStatus.SIN_STOCK) {
            await product_model_1.Product.updateOne({ _id: product._id }, { status: productStatus_enum_1.productStatus.DISPONIBLE });
        }
        if (detailProduct.stock_type === stockType_enum_1.stockType.SERIALIZADO) {
            // Liberar los primeros N seriales vendidos de este detalle
            const serials = await product_serial_model_1.ProductSerial.find({
                company: companyId,
                sale_order_detail: detail._id,
                status: productSerialStatus_enum_1.productSerialStatus.VENDIDO,
            }).limit(returnQty);
            await product_serial_model_1.ProductSerial.updateMany({ _id: { $in: serials.map((s) => s._id) } }, { $set: { status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE, sale_order_detail: null } });
        }
        if (detailProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL &&
            detail.inventory_usage &&
            Array.isArray(detail.inventory_usage) &&
            detail.inventory_usage.length > 0) {
            let qtyToRestore = returnQty;
            for (const usage of detail.inventory_usage) {
                if (qtyToRestore <= 0)
                    break;
                const restoreFromThis = Math.min(usage.quantity, qtyToRestore);
                if (restoreFromThis <= 0)
                    continue;
                const inventory = await product_inventory_model_1.ProductInventory.findOne({
                    company: companyId,
                    product: detailProduct._id,
                    warehouse: usage.warehouse,
                    purchase_order_detail: usage.purchase_order_detail,
                });
                if (inventory) {
                    inventory.sold -= restoreFromThis;
                    if (inventory.sold < 0)
                        inventory.sold = 0;
                    inventory.available += restoreFromThis;
                    if (inventory.available > 0)
                        inventory.status = productInventoryStatus_enum_1.productInventoryStatus.DISPONIBLE;
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
        const detail = detailMap.get(item.saleOrderDetailId);
        if (item.quantity >= detail.quantity) {
            // Devolución total del ítem: eliminar el detalle
            await sale_order_detail_model_1.SaleOrderDetail.deleteOne({ _id: detail._id });
        }
        else {
            // Devolución parcial: reducir cantidad y subtotal
            const itemReturned = parseFloat((detail.sale_price * item.quantity).toFixed(2));
            await sale_order_detail_model_1.SaleOrderDetail.updateOne({ _id: detail._id }, { $inc: { quantity: -item.quantity, subtotal: -itemReturned } });
        }
    }
    const newTotal = parseFloat((saleOrder.total - returnTotal).toFixed(2));
    const setFields = { has_return: true };
    let refundAmount = 0;
    let refundIsQr = false;
    if (saleOrder.payment_method === saleOrderPaymentMethod_1.paymentMethod.CONTADO) {
        if (saleOrder.is_paid) {
            refundAmount = returnTotal;
            refundIsQr = saleOrder.contado_payment_method === "QR";
        }
    }
    else if (saleOrder.payment_method === saleOrderPaymentMethod_1.paymentMethod.CREDITO) {
        const payments = await sale_payment_model_1.SalePayment.find({ sale_order: saleOrder._id, company: companyId });
        const totalPaid = (0, money_1.round2)(payments.reduce((sum, p) => sum + p.amount, 0));
        refundAmount = (0, money_1.round2)(Math.max(totalPaid - Math.max(newTotal, 0), 0));
        refundIsQr = payments.some((p) => p.payment_method === "QR");
        if (newTotal > 0) {
            setFields.is_paid = totalPaid >= newTotal;
        }
    }
    if (newTotal <= 0) {
        setFields.status = saleOrderStatus_enum_1.saleOrderStatus.DEVUELTO;
        setFields.total = 0;
        setFields.is_paid = true;
    }
    await sale_order_model_1.SaleOrder.updateOne({ _id: saleOrderId, company: companyId }, {
        $set: setFields,
        ...(newTotal > 0 ? { $inc: { total: -parseFloat(returnTotal.toFixed(2)) } } : {}),
    });
    if (refundAmount > 0) {
        await (0, notification_service_1.createNotification)(companyId, {
            type: "refund_needed",
            title: "Devolución con saldo a favor del cliente",
            message: refundIsQr
                ? `La devolución en la venta ${saleOrder.code} implica reembolsar ${refundAmount} al cliente, cobrados por QR.`
                : `La devolución en la venta ${saleOrder.code} implica reembolsar ${refundAmount} al cliente.`,
            link: `/ventas/detalle/${saleOrder._id}`,
        });
    }
    // 7. Crear o actualizar el encabezado de la devolución
    let saleReturnDocId;
    if (existingReturn) {
        // Agregar al total de la devolución existente
        await sale_return_model_1.SaleReturn.updateOne({ _id: existingReturn._id }, { $inc: { total: parseFloat(returnTotal.toFixed(2)) } });
        saleReturnDocId = existingReturn._id.toString();
    }
    else {
        const code = await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.SALE_RETURN);
        const newReturn = await sale_return_model_1.SaleReturn.create({
            code,
            sale_order: saleOrderId,
            date: new Date(),
            reason,
            total: parseFloat(returnTotal.toFixed(2)),
            created_by: userId,
            company: companyId,
        });
        await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.SALE_RETURN);
        saleReturnDocId = newReturn._id.toString();
    }
    // 8. Crear o actualizar los detalles de la devolución
    await Promise.all(validItems.map(async (item) => {
        const detail = detailMap.get(item.saleOrderDetailId);
        const itemSubtotal = parseFloat((detail.sale_price * item.quantity).toFixed(2));
        const existingDetail = await sale_return_detail_model_1.SaleReturnDetail.findOne({
            sale_return: saleReturnDocId,
            sale_order_detail: detail._id,
        });
        if (existingDetail) {
            await sale_return_detail_model_1.SaleReturnDetail.updateOne({ _id: existingDetail._id }, { $inc: { quantity: item.quantity, subtotal: itemSubtotal } });
        }
        else {
            await sale_return_detail_model_1.SaleReturnDetail.create({
                sale_return: saleReturnDocId,
                sale_order_detail: detail._id,
                product: detail.product,
                quantity: item.quantity,
                sale_price: detail.sale_price,
                subtotal: itemSubtotal,
                company: companyId,
            });
        }
    }));
    return sale_return_model_1.SaleReturn.findById(saleReturnDocId)
        .populate({ path: "sale_order", populate: { path: "client" } })
        .populate("created_by")
        .lean();
};
exports.createSaleReturn = createSaleReturn;
const findAllSaleReturns = async (companyId) => {
    return sale_return_model_1.SaleReturn.find({ company: companyId })
        .sort({ createdAt: -1 })
        .populate({ path: "sale_order", populate: { path: "client" } })
        .populate("created_by")
        .lean();
};
exports.findAllSaleReturns = findAllSaleReturns;
const findSaleReturn = async (companyId, saleReturnId) => {
    const saleReturn = await sale_return_model_1.SaleReturn.findOne({ _id: saleReturnId, company: companyId })
        .populate({ path: "sale_order", populate: { path: "client" } })
        .populate("created_by")
        .lean();
    if (!saleReturn)
        throw new Error("Devolución no encontrada");
    return saleReturn;
};
exports.findSaleReturn = findSaleReturn;
const findSaleReturnDetail = async (companyId, saleReturnId) => {
    return sale_return_detail_model_1.SaleReturnDetail.find({ sale_return: saleReturnId, company: companyId })
        .populate("product")
        .lean();
};
exports.findSaleReturnDetail = findSaleReturnDetail;
const findSaleReturnBySaleOrder = async (companyId, saleOrderId) => {
    return sale_return_model_1.SaleReturn.findOne({ sale_order: saleOrderId, company: companyId })
        .populate({ path: "sale_order", populate: { path: "client" } })
        .populate("created_by")
        .lean();
};
exports.findSaleReturnBySaleOrder = findSaleReturnBySaleOrder;
