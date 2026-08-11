"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listKardexByProduct = void 0;
const purchase_order_detail_model_1 = require("../purchase_order/purchase_order_detail.model");
const sale_order_detail_model_1 = require("../sale_order/sale_order_detail.model");
const sale_return_detail_model_1 = require("../sale_return/sale_return_detail.model");
const product_transfer_detail_model_1 = require("../product_transfer/product_transfer_detail.model");
const purchaseOrderStatus_enum_1 = require("../../utils/enums/purchaseOrderStatus.enum");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const productTransferStatus_enum_1 = require("../../utils/enums/productTransferStatus.enum");
const listKardexByProduct = async (companyId, productId) => {
    const entries = [];
    // ── Compras aprobadas ───────────────────────────────────────
    const purchases = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        product: productId,
    })
        .populate({
        path: "purchase_order",
        match: { status: purchaseOrderStatus_enum_1.purchaseOrderStatus.APROBADO },
        populate: [
            { path: "created_by", select: "user_name" },
            { path: "provider", select: "name" },
        ],
    })
        .lean();
    for (const detail of purchases) {
        const po = detail.purchase_order;
        if (!po)
            continue;
        entries.push({
            _id: `compra-${detail._id.toString()}`,
            date: new Date(po.date).getTime(),
            type: "Compra",
            reference_code: po.code,
            reference_id: po._id.toString(),
            quantity: detail.quantity,
            unit_price: detail.purchase_price ?? 0,
            subtotal: detail.subtotal ?? 0,
            balance: 0,
            created_by: po.created_by?.user_name ?? "—",
            entity_name: po.provider?.name ?? "—",
        });
    }
    // ── Ventas aprobadas o devueltas ────────────────────────────
    const sales = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        product: productId,
    })
        .populate({
        path: "sale_order",
        match: {
            status: { $in: [saleOrderStatus_enum_1.saleOrderStatus.APROBADO, saleOrderStatus_enum_1.saleOrderStatus.DEVUELTO] },
        },
        populate: [
            { path: "created_by", select: "user_name" },
            { path: "client", select: "fullName" },
        ],
    })
        .lean();
    for (const detail of sales) {
        const so = detail.sale_order;
        if (!so)
            continue;
        entries.push({
            _id: `venta-${detail._id.toString()}`,
            date: new Date(so.date).getTime(),
            type: "Venta",
            reference_code: so.code,
            reference_id: so._id.toString(),
            quantity: -detail.quantity,
            unit_price: detail.sale_price ?? 0,
            subtotal: detail.subtotal ?? 0,
            balance: 0,
            created_by: so.created_by?.user_name ?? "—",
            entity_name: so.client?.fullName ?? "—",
            currency: so.currency ?? null,
            exchange_rate: so.exchange_rate ?? null,
        });
    }
    // ── Devoluciones ────────────────────────────────────────────
    const returns = await sale_return_detail_model_1.SaleReturnDetail.find({
        company: companyId,
        product: productId,
    })
        .populate({
        path: "sale_return",
        populate: [
            { path: "created_by", select: "user_name" },
            { path: "sale_order", select: "currency exchange_rate" },
        ],
    })
        .lean();
    for (const detail of returns) {
        const sr = detail.sale_return;
        if (!sr)
            continue;
        entries.push({
            _id: `devolucion-${detail._id.toString()}`,
            date: new Date(sr.date).getTime(),
            type: "Devolución",
            reference_code: sr.code,
            reference_id: sr._id.toString(),
            quantity: detail.quantity,
            unit_price: detail.sale_price ?? 0,
            subtotal: detail.subtotal ?? 0,
            balance: 0,
            created_by: sr.created_by?.user_name ?? "—",
            entity_name: sr.reason ?? "—",
            currency: sr.sale_order?.currency ?? null,
            exchange_rate: sr.sale_order?.exchange_rate ?? null,
        });
    }
    // ── Transferencias aprobadas ────────────────────────────────
    const transfers = await product_transfer_detail_model_1.ProductTransferDetail.find({
        company: companyId,
        product: productId,
    })
        .populate({
        path: "product_transfer",
        match: { status: productTransferStatus_enum_1.productTransferStatus.APROBADO },
        populate: [
            { path: "created_by", select: "user_name" },
            { path: "origin_warehouse", select: "name" },
            { path: "destination_warehouse", select: "name" },
        ],
    })
        .lean();
    for (const detail of transfers) {
        const pt = detail.product_transfer;
        if (!pt)
            continue;
        const origin = pt.origin_warehouse?.name ?? "?";
        const dest = pt.destination_warehouse?.name ?? "?";
        entries.push({
            _id: `transferencia-${detail._id.toString()}`,
            date: new Date(pt.date).getTime(),
            type: "Transferencia",
            reference_code: pt.code,
            reference_id: pt._id.toString(),
            quantity: detail.quantity,
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
exports.listKardexByProduct = listKardexByProduct;
