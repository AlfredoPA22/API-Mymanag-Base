/**
 * Script de corrección: incrementa el stock y actualiza el estado de los
 * productos cuyos ProductInventory fueron corregidos por fixBorradorInventory.ts
 * pero sin actualizar el producto.
 *
 * Identifica los registros por updatedAt >= hoy (el script anterior los tocó hoy).
 *
 * Ejecutar con:
 *   npx ts-node scripts/fixProductStock.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

// ── Modelos inline ────────────────────────────────────────────────────────────

const PurchaseOrderDetailSchema = new mongoose.Schema(
  {
    purchase_order: { type: mongoose.Schema.Types.ObjectId },
    product: { type: mongoose.Schema.Types.ObjectId },
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
  { status: { type: String } },
  { strict: false }
);
const PurchaseOrder = mongoose.model("purchase_order", PurchaseOrderSchema);

const ProductInventorySchema = new mongoose.Schema(
  {
    status: { type: String },
    available: { type: Number },
    quantity: { type: Number },
    purchase_order_detail: { type: mongoose.Schema.Types.ObjectId },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false, timestamps: true }
);
const ProductInventory = mongoose.model(
  "product_inventory",
  ProductInventorySchema
);

const ProductSchema = new mongoose.Schema(
  {
    stock: { type: Number },
    status: { type: String },
    last_cost_price: { type: Number },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const Product = mongoose.model("product", ProductSchema);

// ── Script principal ──────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  // Inicio del día de hoy (UTC)
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  console.log(`Buscando ProductInventory actualizados desde: ${startOfToday.toISOString()}`);

  // 1. ProductInventory en Disponible, con purchase_order_detail, actualizados hoy
  const recentlyFixed = await ProductInventory.find({
    status: "Disponible",
    purchase_order_detail: { $ne: null },
    updatedAt: { $gte: startOfToday },
  }).lean();

  console.log(`ProductInventory actualizados hoy: ${recentlyFixed.length}`);

  if (recentlyFixed.length === 0) {
    console.log("No hay registros a procesar.");
    await mongoose.disconnect();
    return;
  }

  // 2. Cargar los detalles de compra
  const detailIds = recentlyFixed.map((inv) => inv.purchase_order_detail);
  const details = await PurchaseOrderDetail.find({
    _id: { $in: detailIds },
  }).lean();

  const detailMap = new Map(details.map((d) => [d._id.toString(), d]));

  // 3. Verificar que la orden esté aprobada (doble chequeo)
  const orderIds = details.map((d) => d.purchase_order);
  const approvedOrders = await PurchaseOrder.find({
    _id: { $in: orderIds },
    status: "Aprobado",
  }).lean();

  const approvedOrderIds = new Set(approvedOrders.map((o) => o._id.toString()));

  const toFix = recentlyFixed.filter((inv) => {
    if (!inv.purchase_order_detail) return false;
    const detail = detailMap.get(inv.purchase_order_detail.toString());
    if (!detail || !detail.purchase_order) return false;
    return approvedOrderIds.has(detail.purchase_order.toString());
  });

  console.log(`Registros a procesar (orden aprobada): ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log("No hay registros a procesar.");
    await mongoose.disconnect();
    return;
  }

  // 4. Actualizar stock y estado del producto
  let fixed = 0;
  let errors = 0;

  for (const inv of toFix) {
    const detail = detailMap.get(inv.purchase_order_detail!.toString())!;
    const quantity = detail.quantity ?? inv.quantity ?? 0;
    const productId = detail.product;

    try {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId },
        {
          $inc: { stock: quantity },
          $set: {
            last_cost_price: detail.purchase_price,
            status: "Disponible",
          },
        },
        { new: true }
      ).lean();

      fixed++;
      console.log(
        `  ✔ product ${productId} stock +${quantity}` +
        ` (stock actual: ${updatedProduct?.stock ?? "?"})` +
        ` | last_cost_price: ${detail.purchase_price}`
      );
    } catch (err: any) {
      errors++;
      console.error(`  ✘ Error en product ${productId}:`, err.message);
    }
  }

  console.log(`\nResumen: ${fixed} productos actualizados, ${errors} errores.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
