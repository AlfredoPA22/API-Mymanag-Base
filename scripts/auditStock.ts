/**
 * Script de auditoría de stock (solo lectura).
 * Compara el stock actual de cada producto contra el valor correcto calculado
 * desde las colecciones fuente, sin modificar ningún documento.
 *
 * Fuente de verdad:
 *   - INDIVIDUAL:   SUM(available + reserved) en product_inventory donde status in ["Disponible", "Sin stock"]
 *   - SERIALIZADO:  COUNT(product_serial)      donde status = "Disponible"
 *
 * Ejecutar con:
 *   npx ts-node scripts/auditStock.ts
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
    code: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const Product = mongoose.model("product", ProductSchema);

const ProductInventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId },
    available: { type: Number },
    reserved: { type: Number },
    status: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId },
  },
  { strict: false }
);
const ProductInventory = mongoose.model(
  "product_inventory",
  ProductInventorySchema
);

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

interface Discrepancy {
  id: string;
  code: string;
  name: string;
  stock_type: string;
  stockActual: number;
  stockCorrecto: number;
  statusActual: string;
  statusCorrecto: string;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  const products = await Product.find({}).lean();
  console.log(`Total de productos: ${products.length}\n`);

  const discrepancies: Discrepancy[] = [];
  let ok = 0;
  let errors = 0;

  for (const product of products) {
    try {
      let correctStock = 0;

      if (product.stock_type === "individual") {
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
      const stockOk = product.stock === correctStock;
      const statusOk = product.status === correctStatus;

      if (stockOk && statusOk) {
        ok++;
      } else {
        discrepancies.push({
          id: product._id.toString(),
          code: product.code ?? "-",
          name: product.name ?? "-",
          stock_type: product.stock_type ?? "-",
          stockActual: product.stock ?? 0,
          stockCorrecto: correctStock,
          statusActual: product.status ?? "-",
          statusCorrecto: correctStatus,
        });
      }
    } catch (err: any) {
      errors++;
      console.error(`  ✘ Error en producto ${product._id}:`, err.message);
    }
  }

  // ── Reporte ──────────────────────────────────────────────────────────────────

  console.log("═".repeat(80));
  console.log("PRODUCTOS CON DESCOMPAGINACIÓN");
  console.log("═".repeat(80));

  if (discrepancies.length === 0) {
    console.log("\n  Todo el stock está correcto. No hay descompaginaciones.\n");
  } else {
    for (const d of discrepancies) {
      const stockDiff = d.stockCorrecto - d.stockActual;
      const diffStr = stockDiff >= 0 ? `+${stockDiff}` : `${stockDiff}`;

      console.log(`\n  [${d.stock_type.toUpperCase()}] ${d.code} — ${d.name}`);
      console.log(`    ID       : ${d.id}`);

      if (d.stockActual !== d.stockCorrecto) {
        console.log(
          `    Stock    : ${d.stockActual} (actual)  →  ${d.stockCorrecto} (correcto)  [${diffStr}]`
        );
      }
      if (d.statusActual !== d.statusCorrecto) {
        console.log(
          `    Status   : "${d.statusActual}" (actual)  →  "${d.statusCorrecto}" (correcto)`
        );
      }
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log("RESUMEN");
  console.log("═".repeat(80));
  console.log(`  Correctos        : ${ok}`);
  console.log(`  Descompaginados  : ${discrepancies.length}`);
  if (errors > 0) console.log(`  Errores          : ${errors}`);
  console.log("");

  if (discrepancies.length > 0) {
    console.log(
      `  Para corregirlos ejecuta: npx ts-node scripts/reconcileStock.ts\n`
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
