import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { User } from "../user/user.model";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import {
  FilterProfitabilityInput,
  IProfitabilityByCategory,
  IProfitabilityByProduct,
  IProfitabilityReport,
} from "../../interfaces/profitability.interface";
import { round2 } from "../../utils/money";

export const profitabilityReport = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filterInput: FilterProfitabilityInput
): Promise<IProfitabilityReport> => {
  const foundUser = await User.findOne({ _id: userId, company: companyId }).lean();
  if (!foundUser) throw new Error("Usuario no encontrado");

  // Filtro de órdenes de venta aprobadas
  const orderQuery: any = {
    company: companyId,
    status: saleOrderStatus.APROBADO,
  };

  if (!(foundUser as any).is_global) {
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

  const saleOrders = await SaleOrder.find(orderQuery).lean();
  if (saleOrders.length === 0) {
    return { by_product: [], by_category: [], total_revenue: 0, total_cost: 0, total_gross_profit: 0, total_margin_percent: 0 };
  }

  const saleOrderIds = saleOrders.map((o: any) => o._id);

  // Detalles con producto populado (categoría y marca incluidas)
  const details = await SaleOrderDetail.find({
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

  const byProduct = new Map<string, IProfitabilityByProduct>();
  const byCategory = new Map<string, IProfitabilityByCategory>();
  let totalRevenue = 0;
  let totalCost = 0;

  for (const detail of details) {
    const product = (detail as any).product;
    if (!product) continue;

    const qty: number = (detail as any).quantity ?? 0;
    const revenue: number = (detail as any).subtotal ?? 0;
    const cost: number = qty * ((product as any).last_cost_price ?? 0);
    const profit = revenue - cost;

    totalRevenue += revenue;
    totalCost += cost;

    // Agrupación por producto
    const pId = product._id.toString();
    if (!byProduct.has(pId)) {
      byProduct.set(pId, {
        product_id: pId,
        product_code: (product as any).code ?? "—",
        product_name: (product as any).name ?? "—",
        category_name: (product as any).category?.name ?? "Sin categoría",
        brand_name: (product as any).brand?.name ?? "—",
        units_sold: 0,
        revenue: 0,
        cost: 0,
        gross_profit: 0,
        margin_percent: 0,
      });
    }
    const p = byProduct.get(pId)!;
    p.units_sold += qty;
    p.revenue += revenue;
    p.cost += cost;
    p.gross_profit += profit;

    // Agrupación por categoría
    const cat = (product as any).category;
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
    const c = byCategory.get(cId)!;
    c.units_sold += qty;
    c.revenue += revenue;
    c.cost += cost;
    c.gross_profit += profit;
  }

  const by_product = Array.from(byProduct.values())
    .map((p) => ({ ...p, revenue: round2(p.revenue), cost: round2(p.cost), gross_profit: round2(p.gross_profit), margin_percent: p.revenue > 0 ? round2((p.gross_profit / p.revenue) * 100) : 0 }))
    .sort((a, b) => b.gross_profit - a.gross_profit);

  const by_category = Array.from(byCategory.values())
    .map((c) => ({ ...c, revenue: round2(c.revenue), cost: round2(c.cost), gross_profit: round2(c.gross_profit), margin_percent: c.revenue > 0 ? round2((c.gross_profit / c.revenue) * 100) : 0 }))
    .sort((a, b) => b.gross_profit - a.gross_profit);

  const totalGrossProfit = totalRevenue - totalCost;

  return {
    by_product,
    by_category,
    total_revenue: round2(totalRevenue),
    total_cost: round2(totalCost),
    total_gross_profit: round2(totalGrossProfit),
    total_margin_percent: totalRevenue > 0 ? round2((totalGrossProfit / totalRevenue) * 100) : 0,
  };
};
