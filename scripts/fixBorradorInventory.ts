/**
 * Script de corrección: pone en "Disponible" todos los ProductInventory
 * que quedaron en "Borrador" pero cuya orden de compra ya fue aprobada.
 * También incrementa el stock del producto y actualiza su estado.
 *
 * Ejecutar con:
 *   npx ts-node scripts/fixBorradorInventory.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

// ── Modelos inline ────────────────────────────────────────────────────────────

const PurchaseOrderDetailSchema = new mongoose.Schema(
  {
    purchase_order: { type: mongoose.Schema.Types.ObjectId, ref: "purchase_order" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
    quantity: { type: Number },
    purchase_price: { type: Number },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "company" },
  },
  { strict: false }
);
const PurchaseOrderDetail = mongoose.model(
  "purchase_order_detail",
  PurchaseOrderDetailSchema
);

const PurchaseOrderSchema = new mongoose.Schema(
  { status: { type: String }, company: { type: mongoose.Schema.Types.ObjectId } },
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
  { strict: false }
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

  // 1. ProductInventory en Borrador con purchase_order_detail
  const borradorInventories = await ProductInventory.find({
    status: "Borrador",
    purchase_order_detail: { $ne: null },
  }).lean();

  console.log(`ProductInventory en Borrador: ${borradorInventories.length}`);

  if (borradorInventories.length === 0) {
    console.log("No hay registros a corregir.");
    await mongoose.disconnect();
    return;
  }

  // 2. Cargar los detalles de compra
  const detailIds = borradorInventories.map((inv) => inv.purchase_order_detail);
  const details = await PurchaseOrderDetail.find({
    _id: { $in: detailIds },
  }).lean();

  const detailMap = new Map(details.map((d) => [d._id.toString(), d]));

  // 3. Verificar cuáles órdenes están aprobadas
  const orderIds = details.map((d) => d.purchase_order);
  const approvedOrders = await PurchaseOrder.find({
    _id: { $in: orderIds },
    status: "Aprobado",
  }).lean();

  const approvedOrderIds = new Set(approvedOrders.map((o) => o._id.toString()));

  console.log(`Órdenes aprobadas encontradas: ${approvedOrders.length}`);

  // 4. Filtrar solo los que corresponden a órdenes aprobadas
  const toFix = borradorInventories.filter((inv) => {
    if (!inv.purchase_order_detail) return false;
    const detail = detailMap.get(inv.purchase_order_detail.toString());
    if (!detail || !detail.purchase_order) return false;
    return approvedOrderIds.has(detail.purchase_order.toString());
  });

  console.log(`ProductInventory a corregir: ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log("No hay registros a corregir.");
    await mongoose.disconnect();
    return;
  }

  // 5. Corregir cada registro
  let fixed = 0;
  let errors = 0;

  for (const inv of toFix) {
    const detail = detailMap.get(inv.purchase_order_detail!.toString())!;
    const quantity = detail.quantity ?? inv.quantity ?? 0;
    const productId = detail.product;

    try {
      // Actualizar ProductInventory → Disponible
      await ProductInventory.updateOne(
        { _id: inv._id },
        { $set: { status: "Disponible", available: quantity } }
      );

      // Incrementar stock del producto y actualizar last_cost_price + status
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
        `  ✔ product_inventory ${inv._id} → Disponible` +
        ` | product ${productId} stock +${quantity}` +
        ` (stock actual: ${updatedProduct?.stock ?? "?"})`
      );
    } catch (err: any) {
      errors++;
      console.error(`  ✘ Error en inventory ${inv._id}:`, err.message);
    }
  }

  console.log(`\nResumen: ${fixed} corregidos, ${errors} errores.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
