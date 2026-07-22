/**
 * Script de diagnóstico (SOLO LECTURA, no modifica nada):
 * Busca detalles de órdenes de compra cuyo producto es de tipo "individual"
 * (no serializado) y que NO tienen un ProductInventory asociado — la misma
 * condición que bloquea la aprobación con el error "Faltan registros de
 * inventario para N producto(s) no serializados."
 *
 * Ejecutar con:
 *   npx ts-node scripts/findMissingInventoryDetails.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

// ── Modelos inline (solo los campos que necesitamos leer) ───────────────────

const PurchaseOrderDetailSchema = new mongoose.Schema(
  {
    purchase_order: { type: mongoose.Schema.Types.ObjectId, ref: "purchase_order" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
    quantity: { type: Number },
    purchase_price: { type: Number },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const PurchaseOrderDetail = mongoose.model(
  "purchase_order_detail",
  PurchaseOrderDetailSchema
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    code: { type: String },
    status: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const PurchaseOrder = mongoose.model("purchase_order", PurchaseOrderSchema);

const ProductInventorySchema = new mongoose.Schema(
  { purchase_order_detail: { type: mongoose.Schema.Types.ObjectId } },
  { strict: false }
);
const ProductInventory = mongoose.model(
  "product_inventory",
  ProductInventorySchema
);

const ProductSchema = new mongoose.Schema(
  { code: { type: String }, name: { type: String }, stock_type: { type: String } },
  { strict: false }
);
const Product = mongoose.model("product", ProductSchema);

const CompanySchema = new mongoose.Schema(
  { name: { type: String } },
  { strict: false }
);
const Company = mongoose.model("company", CompanySchema);

// ── Script principal ─────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  // 1. Todos los detalles de compra cuyo producto es "individual"
  const individualProducts = await Product.find({ stock_type: "individual" })
    .select("_id code name company")
    .lean();
  const individualProductIds = individualProducts.map((p) => p._id);
  const productMap = new Map(individualProducts.map((p) => [p._id.toString(), p]));

  const details = await PurchaseOrderDetail.find({
    product: { $in: individualProductIds },
  }).lean();

  console.log(`Detalles de compra con producto "individual": ${details.length}`);

  if (details.length === 0) {
    console.log("No hay nada que revisar.");
    await mongoose.disconnect();
    return;
  }

  // 2. Cuáles de esos detalles YA tienen ProductInventory
  const detailIds = details.map((d) => d._id);
  const inventories = await ProductInventory.find({
    purchase_order_detail: { $in: detailIds },
  })
    .select("purchase_order_detail")
    .lean();
  const detailIdsWithInventory = new Set(
    inventories.map((inv) => inv.purchase_order_detail?.toString())
  );

  // 3. Filtrar los que NO tienen inventario
  const missing = details.filter(
    (d) => !detailIdsWithInventory.has(d._id.toString())
  );

  console.log(`Detalles SIN ProductInventory: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log("No hay detalles inconsistentes.");
    await mongoose.disconnect();
    return;
  }

  // 4. Cargar orden de compra, empresa y producto para cada uno, y agrupar por orden
  const orderIds = [...new Set(missing.map((d) => d.purchase_order?.toString()).filter(Boolean))];
  const orders = await PurchaseOrder.find({ _id: { $in: orderIds } }).lean();
  const orderMap = new Map(orders.map((o) => [o._id.toString(), o]));

  const companyIds = [...new Set(orders.map((o) => o.company?.toString()).filter(Boolean))];
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));

  const byOrder = new Map<string, typeof missing>();
  for (const d of missing) {
    const key = d.purchase_order?.toString() ?? "sin-orden";
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key)!.push(d);
  }

  for (const [orderId, orderDetails] of byOrder) {
    const order = orderMap.get(orderId);
    const company = order?.company ? companyMap.get(order.company.toString()) : null;
    console.log(
      `\n── Orden ${order?.code ?? orderId} | Estado: ${order?.status ?? "?"} | Empresa: ${company?.name ?? order?.company ?? "?"} ──`
    );
    for (const d of orderDetails) {
      const product = d.product ? productMap.get(d.product.toString()) : undefined;
      console.log(
        `   • [${product?.code ?? "?"}] ${product?.name ?? d.product} — cantidad: ${d.quantity}, precio compra: ${d.purchase_price} (detailId: ${d._id})`
      );
    }
  }

  console.log(`\nResumen: ${byOrder.size} orden(es) afectada(s), ${missing.length} detalle(s) sin inventario.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
