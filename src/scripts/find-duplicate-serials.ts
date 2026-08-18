/**
 * Script de diagnóstico: busca seriales duplicados (mismo `serial` para la
 * misma `company`) en product_serial.
 *
 * NO modifica nada en la base de datos. Existe porque hoy no hay ningún
 * índice único que impida crear el mismo serial dos veces — antes de
 * agregarlo (ver product_serial.model.ts) hay que confirmar que no queden
 * duplicados ya guardados, porque Mongo rechaza construir un índice único
 * sobre datos que ya lo violan.
 *
 * Uso:
 *   npx ts-node src/scripts/find-duplicate-serials.ts [--company <id>]
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";
import { ProductSerial } from "../modules/product/product_serial.model";

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        result[key] = args[i + 1];
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

async function run() {
  const args = parseArgs();
  const companyId = args["company"] as string | undefined;

  await connectToMongoDB();

  const match: Record<string, unknown> = {};
  if (companyId) {
    match.company = new mongoose.Types.ObjectId(companyId);
  }

  const duplicates = await ProductSerial.aggregate([
    { $match: match },
    {
      $group: {
        _id: { company: "$company", serial: "$serial" },
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: "$_id",
            product: "$product",
            warehouse: "$warehouse",
            purchase_order_detail: "$purchase_order_detail",
            sale_order_detail: "$sale_order_detail",
            status: "$status",
            createdAt: "$createdAt",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (duplicates.length === 0) {
    console.log("✅  No se encontraron seriales duplicados.\n");
  } else {
    console.log(`❌  ${duplicates.length} serial(es) duplicado(s):\n`);
    for (const dup of duplicates) {
      console.log(`   🔁  company=${dup._id.company} serial="${dup._id.serial}" — ${dup.count} copias`);
      for (const doc of dup.docs) {
        console.log(
          `       _id=${doc._id} product=${doc.product} warehouse=${doc.warehouse} status=${doc.status} purchase_order_detail=${doc.purchase_order_detail} sale_order_detail=${doc.sale_order_detail ?? "null"} createdAt=${doc.createdAt?.toISOString?.() ?? doc.createdAt}`
        );
      }
      console.log();
    }
  }

  console.log(`📊  Resumen: ${duplicates.length} serial(es) duplicado(s) encontrados.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Error inesperado:", err);
  mongoose.disconnect();
  process.exit(1);
});
