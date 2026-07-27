/**
 * Corrige ventas en estado "Borrador" que están marcadas como pagadas
 * (is_paid: true) sin un cobro real detrás.
 *
 * Regla: una venta en Borrador solo puede estar pagada de verdad si tiene un
 * QrPayment procesado (cobro real confirmado por Mesa de Pagos) — típicamente
 * ventas de la tienda con productos serializados, pendientes de que un admin
 * les asigne seriales y las apruebe.
 *
 * Para el resto (Efectivo/Transferencia marcadas pagadas al crearse bajo la
 * regla vieja, y QR manual sin ningún cobro real de por medio) se revierte
 * is_paid a false — con la regla nueva, is_paid se confirma recién al
 * aprobar la venta (Efectivo/Transferencia) o vía webhook real (QR).
 *
 * Ejecutar con:
 *   npx ts-node scripts/fixBorradorPaidOrders.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

// ── Modelos inline ────────────────────────────────────────────────────────────

const SaleOrderSchema = new mongoose.Schema(
  {
    code: String,
    status: String,
    is_paid: Boolean,
    payment_method: String,
    contado_payment_method: String,
    company: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);
const SaleOrder = mongoose.model("sale_order", SaleOrderSchema);

const QrPaymentSchema = new mongoose.Schema(
  { sale_order: mongoose.Schema.Types.ObjectId, processed: Boolean },
  { strict: false }
);
const QrPayment = mongoose.model("qr_payment", QrPaymentSchema);

const CompanySchema = new mongoose.Schema({ name: String }, { strict: false });
const Company = mongoose.model("company", CompanySchema);

// ── Script principal ──────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  const orders = await SaleOrder.find({
    status: "Borrador",
    is_paid: true,
  }).lean<any[]>();

  console.log(`Total de ventas en Borrador marcadas como pagadas: ${orders.length}\n`);

  let fixed = 0;
  let skippedRealQr = 0;

  for (const order of orders) {
    const realQrPayment = await QrPayment.findOne({
      sale_order: order._id,
      processed: true,
    }).lean();

    if (realQrPayment) {
      skippedRealQr++;
      console.log(`  ⏭  ${order.code} — cobro QR real confirmado, no se toca (falta aprobar)`);
      continue;
    }

    await SaleOrder.updateOne({ _id: order._id }, { $set: { is_paid: false } });
    fixed++;

    const company = await Company.findById(order.company).lean<any>();
    console.log(
      `  ✔ ${order.code} — ${company?.name ?? "(empresa no encontrada)"}` +
        ` (${order.payment_method}/${order.contado_payment_method ?? "-"})` +
        `  is_paid: true → false`
    );
  }

  console.log(`\nResumen:`);
  console.log(`  Corregidas (is_paid → false) : ${fixed}`);
  console.log(`  Sin tocar (cobro QR real)    : ${skippedRealQr}`);
  console.log(`  Total revisadas              : ${orders.length}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
