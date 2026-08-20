/**
 * Script de diagnóstico: busca empresas con más de una caja en estado
 * ABIERTA al mismo tiempo.
 *
 * NO modifica nada en la base de datos. Existe porque hoy no hay ningún
 * índice que impida abrir dos cajas para la misma empresa — antes de
 * agregarlo (ver cash_register.model.ts) hay que confirmar que no queden
 * duplicados ya guardados, porque Mongo rechaza construir un índice único
 * sobre datos que ya lo violan.
 *
 * Uso:
 *   npx ts-node src/scripts/find-duplicate-open-cash-registers.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";
import { CashRegister } from "../modules/cash_register/cash_register.model";

dotenv.config();

async function run() {
  await connectToMongoDB();

  const duplicates = await CashRegister.aggregate([
    { $match: { status: "ABIERTA" } },
    {
      $group: {
        _id: "$company",
        count: { $sum: 1 },
        docs: { $push: { _id: "$_id", opening_date: "$opening_date", opened_by: "$opened_by" } },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length === 0) {
    console.log("✅  No hay ninguna empresa con más de una caja abierta.\n");
  } else {
    console.log(`❌  ${duplicates.length} empresa(s) con más de una caja abierta:\n`);
    for (const dup of duplicates) {
      console.log(`   🔁  company=${dup._id} — ${dup.count} cajas abiertas`);
      for (const doc of dup.docs) {
        console.log(`       _id=${doc._id} opened_by=${doc.opened_by} opening_date=${doc.opening_date}`);
      }
      console.log();
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Error inesperado:", err);
  mongoose.disconnect();
  process.exit(1);
});
