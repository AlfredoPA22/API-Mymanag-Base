/**
 * Vacía los datos operativos de una empresa (productos, categorías, marcas,
 * almacenes, proveedores, clientes, compras, ventas, pagos, devoluciones,
 * inventario, seriales, transferencias, kardex y notificaciones).
 *
 * NO toca: el documento de la empresa (company), sus usuarios ni sus roles.
 *
 * Modo dry-run por defecto (solo cuenta, no borra). Para ejecutar de verdad:
 *   npx ts-node scripts/wipeCompanyData.ts <companyId> --yes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

const COMPANY_ID = process.argv[2];
const CONFIRMED = process.argv.includes("--yes");

if (!COMPANY_ID) {
  console.error("Uso: npx ts-node scripts/wipeCompanyData.ts <companyId> [--yes]");
  process.exit(1);
}

// Colecciones que se vacían por completo (scoped a la empresa).
const COLLECTIONS_TO_WIPE = [
  "products",
  "categories",
  "brands",
  "warehouses",
  "providers",
  "clients",
  "purchase_orders",
  "purchase_order_details",
  "sale_orders",
  "sale_order_details",
  "sale_payments",
  "sale_returns",
  "sale_return_details",
  "product_inventories",
  "product_serials",
  "product_transfers",
  "product_transfer_details",
  "kardexes",
  "notifications",
  "codegenerators",
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const companyObjectId = new mongoose.Types.ObjectId(COMPANY_ID);

  const company = await db
    .collection("companies")
    .findOne({ _id: companyObjectId });

  if (!company) {
    console.error("No se encontró la empresa con ese id.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Empresa: ${company.name} (${COMPANY_ID})\n`);
  console.log(CONFIRMED ? "Modo: BORRADO REAL\n" : "Modo: DRY-RUN (no se borra nada)\n");

  let totalToDelete = 0;

  for (const col of COLLECTIONS_TO_WIPE) {
    const filter = { company: companyObjectId };
    const count = await db.collection(col).countDocuments(filter);
    totalToDelete += count;

    if (!CONFIRMED) {
      console.log(`  [dry-run] ${col}: ${count} documento(s) se borrarían`);
      continue;
    }

    if (count === 0) {
      console.log(`  ${col}: 0 (nada que borrar)`);
      continue;
    }

    const result = await db.collection(col).deleteMany(filter);
    console.log(`  ${col}: ${result.deletedCount} documento(s) borrados`);
  }

  console.log(`\nTotal ${CONFIRMED ? "borrado" : "a borrar"}: ${totalToDelete} documento(s).`);
  console.log("Usuarios y roles de la empresa NO fueron tocados.");

  if (!CONFIRMED) {
    console.log("\nEsto fue un dry-run. Vuelve a ejecutar con --yes para borrar de verdad.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
