/**
 * Script de diagnóstico: busca SaleOrderDetail serializados cuyo contador
 * `serials` (cuántos hay asignados) no coincide con la cantidad real de
 * ProductSerial en estado Vendido/Reservado/Borrador ligados a esa línea.
 *
 * Se desincronizaba en devoluciones parciales de un producto serializado
 * hechas antes de este fix — createSaleReturn liberaba los ProductSerial
 * pero nunca decrementaba SaleOrderDetail.serials, dejando conteos como
 * "3/1" en vez de "1/1".
 *
 * Por defecto es de SOLO LECTURA. Pasar --fix para corregir de verdad los
 * que estén desincronizados (recalcula `serials` = conteo real).
 *
 * Uso:
 *   npx ts-node src/scripts/find-mismatched-serial-counters.ts
 *   npx ts-node src/scripts/find-mismatched-serial-counters.ts --fix
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";
import { ProductSerial } from "../modules/product/product_serial.model";
import { SaleOrderDetail } from "../modules/sale_order/sale_order_detail.model";
import { Product } from "../modules/product/product.model";
import { stockType } from "../utils/enums/stockType.enum";

dotenv.config();

async function run() {
  const shouldFix = process.argv.includes("--fix");

  await connectToMongoDB();

  const serializedProductIds = await Product.find({ stock_type: stockType.SERIALIZADO }).distinct("_id");

  const details = await SaleOrderDetail.find({
    product: { $in: serializedProductIds },
  }).lean();

  const mismatches: { _id: any; storedSerials: number; actualSerials: number; quantity: number }[] = [];

  for (const detail of details) {
    // Cuenta cualquier ProductSerial que todavía está ligado a esta línea,
    // sin importar el status (Vendido normalmente, pero también podría
    // haber quedado alguno en otro estado) — es el mismo criterio que usa
    // incrementSerials/decrementSerials: "cuántos siguen apuntando acá".
    const actualSerials = await ProductSerial.countDocuments({
      sale_order_detail: detail._id,
    });

    if (actualSerials !== (detail as any).serials) {
      mismatches.push({
        _id: detail._id,
        storedSerials: (detail as any).serials,
        actualSerials,
        quantity: (detail as any).quantity,
      });
    }
  }

  if (mismatches.length === 0) {
    console.log("✅  No hay ningún SaleOrderDetail con el contador de seriales desincronizado.\n");
  } else {
    console.log(`❌  ${mismatches.length} SaleOrderDetail(s) con el contador desincronizado:\n`);
    for (const m of mismatches) {
      console.log(
        `   🔁  _id=${m._id}  guardado=${m.storedSerials}  real=${m.actualSerials}  quantity=${m.quantity}`
      );
    }
    console.log();

    if (shouldFix) {
      for (const m of mismatches) {
        await SaleOrderDetail.updateOne({ _id: m._id }, { $set: { serials: m.actualSerials } });
      }
      console.log(`✅  Corregidos ${mismatches.length} registro(s).\n`);
    } else {
      console.log("   (solo lectura — correr con --fix para corregir de verdad)\n");
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
