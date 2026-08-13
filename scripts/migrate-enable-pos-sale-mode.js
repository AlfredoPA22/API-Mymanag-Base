/**
 * Migración: habilita pos_sale_mode_enabled (Modo de venta rápida / POS) en
 * todas las empresas existentes — el campo nuevo tiene default false, así
 * que sin esto ninguna empresa creada antes de esta funcionalidad lo ve,
 * aunque el dueño quiera que esté prendido de entrada para todos.
 *
 * A diferencia de las migraciones de permisos anteriores, acá no hay
 * "rol admin" involucrado — es un campo directo en Company, así que se
 * actualiza la colección "companies" completa.
 *
 * Modo de prueba (no escribe nada, solo muestra qué haría):
 *   node scripts/migrate-enable-pos-sale-mode.js --dry-run
 *
 * Ejecución real:
 *   node scripts/migrate-enable-pos-sale-mode.js
 *
 * Requiere MONGODB_URI en .env (o en el entorno antes de correrlo).
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? " (dry run — no se escribirá nada)" : ""}`);

  try {
    const db = mongoose.connection.db;
    const companies = db.collection("companies");

    const allCompanies = await companies
      .find({}, { projection: { name: 1, pos_sale_mode_enabled: 1 } })
      .toArray();

    console.log(`Encontradas ${allCompanies.length} empresa(s)`);

    let totalUpdated = 0;
    let totalAlreadyOk = 0;

    for (const company of allCompanies) {
      if (company.pos_sale_mode_enabled === true) {
        totalAlreadyOk++;
        continue;
      }

      console.log(`  Empresa "${company.name}" (${company._id}): pos_sale_mode_enabled -> true`);

      if (!DRY_RUN) {
        await companies.updateOne({ _id: company._id }, { $set: { pos_sale_mode_enabled: true } });
      }
      totalUpdated++;
    }

    console.log(
      `\n${DRY_RUN ? "[dry run] " : ""}Listo. ${totalUpdated} empresa(s) actualizada(s), ${totalAlreadyOk} ya lo tenían activo.`
    );
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
