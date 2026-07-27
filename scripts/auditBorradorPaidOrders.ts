/**
 * Script de auditoría (solo lectura) — no modifica ningún documento.
 *
 * Busca ventas en estado "Borrador" que ya están marcadas como pagadas
 * (is_paid: true) y las agrupa en 3 categorías:
 *
 *   1. TIENDA        — vienen de la tienda online (source: "tienda_online").
 *                       Esperado/normal: el pago QR se confirmó de verdad
 *                       (hay un QrPayment real) pero la aprobación automática
 *                       falló (típicamente por seriales faltantes). Se
 *                       resuelven asignando seriales y aprobando a mano.
 *
 *   2. MANUAL con QrPayment real   — venta creada por staff, pero con un
 *                       QrPayment procesado de verdad detrás. Mismo caso que
 *                       el de tienda: falta aprobar manualmente.
 *
 *   3. MANUAL sin QrPayment real   — venta creada por staff, marcada pagada
 *                       sin ningún cobro real de Mesa de Pagos detrás. Son
 *                       ventas de antes de que se corrigiera la regla de
 *                       is_paid (que antes marcaba cualquier venta Contado
 *                       como pagada al crearla, sin importar el método).
 *                       No se puede saber solo con datos si el staff cobró
 *                       de verdad o no — hay que revisarlas a mano.
 *
 * Ejecutar con:
 *   npx ts-node scripts/auditBorradorPaidOrders.ts
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
    source: String,
    total: Number,
    date: Date,
    client: mongoose.Schema.Types.ObjectId,
    created_by: mongoose.Schema.Types.ObjectId,
    company: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);
const SaleOrder = mongoose.model("sale_order", SaleOrderSchema);

const SaleOrderDetailSchema = new mongoose.Schema(
  {
    sale_order: mongoose.Schema.Types.ObjectId,
    product: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    serials: Number,
  },
  { strict: false }
);
const SaleOrderDetail = mongoose.model(
  "sale_order_detail",
  SaleOrderDetailSchema
);

const ProductSchema = new mongoose.Schema(
  { name: String, stock_type: String },
  { strict: false }
);
const Product = mongoose.model("product", ProductSchema);

const QrPaymentSchema = new mongoose.Schema(
  { sale_order: mongoose.Schema.Types.ObjectId, processed: Boolean },
  { strict: false }
);
const QrPayment = mongoose.model("qr_payment", QrPaymentSchema);

const ClientSchema = new mongoose.Schema(
  { fullName: String },
  { strict: false }
);
const Client = mongoose.model("client", ClientSchema);

const UserSchema = new mongoose.Schema(
  { user_name: String },
  { strict: false }
);
const User = mongoose.model("user", UserSchema);

const CompanySchema = new mongoose.Schema({ name: String }, { strict: false });
const Company = mongoose.model("company", CompanySchema);

// ── Script principal ──────────────────────────────────────────────────────────

interface Row {
  code: string;
  companyName: string;
  clientName: string;
  createdByName: string;
  total: number;
  date: Date;
  hasRealQrPayment: boolean;
  missingSerials: string[];
}

async function buildRow(order: any): Promise<Row> {
  const [company, client, createdBy, qrPayment, details] = await Promise.all([
    Company.findById(order.company).lean<any>(),
    order.client ? Client.findById(order.client).lean<any>() : null,
    order.created_by ? User.findById(order.created_by).lean<any>() : null,
    QrPayment.findOne({ sale_order: order._id, processed: true }).lean<any>(),
    SaleOrderDetail.find({ sale_order: order._id }).lean<any[]>(),
  ]);

  const missingSerials: string[] = [];
  for (const detail of details) {
    const product = await Product.findById(detail.product).lean<any>();
    if (
      product?.stock_type === "serializado" &&
      (detail.serials ?? 0) !== detail.quantity
    ) {
      missingSerials.push(
        `${product.name} (${detail.serials ?? 0}/${detail.quantity} seriales)`
      );
    }
  }

  return {
    code: order.code,
    companyName: company?.name ?? "(empresa no encontrada)",
    clientName: client?.fullName ?? "(cliente no encontrado)",
    createdByName: createdBy?.user_name ?? "(usuario no encontrado)",
    total: order.total,
    date: order.date,
    hasRealQrPayment: !!qrPayment,
    missingSerials,
  };
}

function printRow(r: Row) {
  console.log(`\n  ${r.code} — ${r.companyName}`);
  console.log(`    Cliente     : ${r.clientName}`);
  console.log(`    Creada por  : ${r.createdByName}`);
  console.log(`    Total       : ${r.total}`);
  console.log(`    Fecha       : ${r.date?.toISOString?.() ?? r.date}`);
  if (r.missingSerials.length > 0) {
    console.log(`    Seriales faltantes: ${r.missingSerials.join(", ")}`);
  }
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB\n");

  const orders = await SaleOrder.find({
    status: "Borrador",
    is_paid: true,
  }).lean<any[]>();

  console.log(`Total de ventas en Borrador marcadas como pagadas: ${orders.length}`);

  const tienda: any[] = [];
  const manualConQr: any[] = [];
  const manualSinQr: any[] = [];

  for (const order of orders) {
    const row = await buildRow(order);
    if (order.source === "tienda_online") {
      tienda.push(row);
    } else if (row.hasRealQrPayment) {
      manualConQr.push(row);
    } else {
      manualSinQr.push(row);
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log(`1. TIENDA — pago QR confirmado, falta aprobar (${tienda.length})`);
  console.log("═".repeat(80));
  if (tienda.length === 0) console.log("\n  (ninguna)");
  tienda.forEach(printRow);

  console.log("\n" + "═".repeat(80));
  console.log(
    `2. MANUAL con QrPayment real — pago QR confirmado, falta aprobar (${manualConQr.length})`
  );
  console.log("═".repeat(80));
  if (manualConQr.length === 0) console.log("\n  (ninguna)");
  manualConQr.forEach(printRow);

  console.log("\n" + "═".repeat(80));
  console.log(
    `3. MANUAL sin QrPayment real — pagada sin cobro real detrás, revisar a mano (${manualSinQr.length})`
  );
  console.log("═".repeat(80));
  if (manualSinQr.length === 0) console.log("\n  (ninguna)");
  manualSinQr.forEach(printRow);

  console.log("\n" + "═".repeat(80));
  console.log("RESUMEN");
  console.log("═".repeat(80));
  console.log(`  Tienda                    : ${tienda.length}`);
  console.log(`  Manual con QrPayment real : ${manualConQr.length}`);
  console.log(`  Manual sin QrPayment real : ${manualSinQr.length}`);
  console.log(`  Total                     : ${orders.length}`);
  console.log("\n  Este script no modificó nada — es solo de lectura.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
