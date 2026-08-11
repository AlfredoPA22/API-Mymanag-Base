"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profitabilityReport = void 0;
const sale_order_model_1 = require("../sale_order/sale_order.model");
const sale_order_detail_model_1 = require("../sale_order/sale_order_detail.model");
const user_model_1 = require("../user/user.model");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const money_1 = require("../../utils/money");
const profitabilityReport = async (companyId, userId, filterInput) => {
    const foundUser = await user_model_1.User.findOne({ _id: userId, company: companyId }).lean();
    if (!foundUser)
        throw new Error("Usuario no encontrado");
    // Filtro de órdenes de venta aprobadas
    const orderQuery = {
        company: companyId,
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
    };
    if (!foundUser.is_global) {
        orderQuery.created_by = userId;
    }
    if (filterInput.startDate || filterInput.endDate) {
        orderQuery.date = {};
        if (filterInput.startDate) {
            const d = new Date(filterInput.startDate);
            d.setUTCHours(0, 0, 0, 0);
            orderQuery.date.$gte = d;
        }
        if (filterInput.endDate) {
            const d = new Date(filterInput.endDate);
            d.setUTCHours(23, 59, 59, 999);
            orderQuery.date.$lte = d;
        }
    }
    const saleOrders = await sale_order_model_1.SaleOrder.find(orderQuery).lean();
    if (saleOrders.length === 0) {
        return { by_product: [], by_category: [], total_revenue: 0, total_cost: 0, total_gross_profit: 0, total_margin_percent: 0 };
    }
    const saleOrderIds = saleOrders.map((o) => o._id);
    // Cada nota puede estar en la moneda base de la empresa o en su moneda
    // alterna (Bs); el `subtotal` de sus detalles queda en esa misma moneda.
    // Se indexa por orden para poder convertir cada `subtotal` a la moneda
    // base antes de sumarlo — sumarlo crudo mezclaría Bs y $ en un solo total.
    const orderById = new Map(saleOrders.map((o) => [o._id.toString(), o]));
    // Detalles con producto populado (categoría y marca incluidas)
    const details = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        sale_order: { $in: saleOrderIds },
    })
        .populate({
        path: "product",
        populate: [
            { path: "category", select: "_id name" },
            { path: "brand", select: "_id name" },
        ],
    })
        .lean();
    const byProduct = new Map();
    const byCategory = new Map();
    let totalRevenue = 0;
    let totalCost = 0;
    for (const detail of details) {
        const product = detail.product;
        if (!product)
            continue;
        const order = orderById.get(detail.sale_order?.toString());
        const qty = detail.quantity ?? 0;
        const revenue = (0, money_1.toBaseCurrency)(detail.subtotal ?? 0, order?.currency, order?.exchange_rate);
        const cost = qty * (product.last_cost_price ?? 0);
        const profit = revenue - cost;
        totalRevenue += revenue;
        totalCost += cost;
        // Agrupación por producto
        const pId = product._id.toString();
        if (!byProduct.has(pId)) {
            byProduct.set(pId, {
                product_id: pId,
                product_code: product.code ?? "—",
                product_name: product.name ?? "—",
                category_name: product.category?.name ?? "Sin categoría",
                brand_name: product.brand?.name ?? "—",
                units_sold: 0,
                revenue: 0,
                cost: 0,
                gross_profit: 0,
                margin_percent: 0,
            });
        }
        const p = byProduct.get(pId);
        p.units_sold += qty;
        p.revenue += revenue;
        p.cost += cost;
        p.gross_profit += profit;
        // Agrupación por categoría
        const cat = product.category;
        const cId = cat?._id?.toString() ?? "sin-categoria";
        if (!byCategory.has(cId)) {
            byCategory.set(cId, {
                category_id: cId,
                category_name: cat?.name ?? "Sin categoría",
                units_sold: 0,
                revenue: 0,
                cost: 0,
                gross_profit: 0,
                margin_percent: 0,
            });
        }
        const c = byCategory.get(cId);
        c.units_sold += qty;
        c.revenue += revenue;
        c.cost += cost;
        c.gross_profit += profit;
    }
    const by_product = Array.from(byProduct.values())
        .map((p) => ({ ...p, revenue: (0, money_1.round2)(p.revenue), cost: (0, money_1.round2)(p.cost), gross_profit: (0, money_1.round2)(p.gross_profit), margin_percent: p.revenue > 0 ? (0, money_1.round2)((p.gross_profit / p.revenue) * 100) : 0 }))
        .sort((a, b) => b.gross_profit - a.gross_profit);
    const by_category = Array.from(byCategory.values())
        .map((c) => ({ ...c, revenue: (0, money_1.round2)(c.revenue), cost: (0, money_1.round2)(c.cost), gross_profit: (0, money_1.round2)(c.gross_profit), margin_percent: c.revenue > 0 ? (0, money_1.round2)((c.gross_profit / c.revenue) * 100) : 0 }))
        .sort((a, b) => b.gross_profit - a.gross_profit);
    const totalGrossProfit = totalRevenue - totalCost;
    return {
        by_product,
        by_category,
        total_revenue: (0, money_1.round2)(totalRevenue),
        total_cost: (0, money_1.round2)(totalCost),
        total_gross_profit: (0, money_1.round2)(totalGrossProfit),
        total_margin_percent: totalRevenue > 0 ? (0, money_1.round2)((totalGrossProfit / totalRevenue) * 100) : 0,
    };
};
exports.profitabilityReport = profitabilityReport;
