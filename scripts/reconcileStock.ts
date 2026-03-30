/**
 * Script de reconciliación de stock.
 * Recalcula product.stock desde cero usando como fuente de verdad:
 *   - INDIVIDUAL:   SUM(product_inventory.available) donde status = "Disponible"
 *   - SERIALIZADO:  COUNT(product_serial)            donde status = "Disponible"
 *
 * También corrige product.status:
 *   - stock > 0  → "Disponible"
 *   - stock <= 0 → "Sin stock"
 *
 * Ejecutar con:
 *   npx ts-node scripts/reconcileStock.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

// ── Modelos inline ────────────────────────────────────────────────────────────

const ProductSchema = new mongoose.Schema(
  {
    stock: { type: Number },
    status: { type: String },
    stock_type: { type: String },
    name: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const Product = mongoose.model("product", ProductSchema);

const ProductInventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId },
    available: { type: Number },
    status: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const ProductInventory = mongoose.model("product_inventory", ProductInventorySchema);

const ProductSerialSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const ProductSerial = mongoose.model("product_serial", ProductSerialSchema);

// ── Script principal ──────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  const products = await Product.find({}).lean();
  console.log(`Total de productos: ${products.length}\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const product of products) {
    try {
      let correctStock = 0;

      if (product.stock_type === "individual") {
        // product.stock = available + reserved (el stock baja solo al aprobar la venta)
        const result = await ProductInventory.aggregate([
          {
            $match: {
              product: product._id,
              status: { $in: ["Disponible", "Sin stock"] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $add: ["$available", "$reserved"] } },
            },
          },
        ]);
        correctStock = result[0]?.total ?? 0;

      } else if (product.stock_type === "serializado") {
        // Disponible + Reservado: el reservado sigue en stock hasta que se aprueba la venta
        correctStock = await ProductSerial.countDocuments({
          product: product._id,
          status: { $in: ["Disponible", "Reservado"] },
        });
      }

      const correctStatus = correctStock > 0 ? "Disponible" : "Sin stock";
      const stockChanged = product.stock !== correctStock;
      const statusChanged = product.status !== correctStatus;

      if (!stockChanged && !statusChanged) {
        unchanged++;
        continue;
      }

      await Product.updateOne(
        { _id: product._id },
        { $set: { stock: correctStock, status: correctStatus } }
      );

      updated++;
      console.log(
        `  ✔ ${product.name} (${product.stock_type})` +
        `  stock: ${product.stock} → ${correctStock}` +
        (statusChanged ? `  status: ${product.status} → ${correctStatus}` : "")
      );

    } catch (err: any) {
      errors++;
      console.error(`  ✘ Error en producto ${product._id}:`, err.message);
    }
  }

  console.log(`\nResumen:`);
  console.log(`  Actualizados : ${updated}`);
  console.log(`  Sin cambios  : ${unchanged}`);
  console.log(`  Errores      : ${errors}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
