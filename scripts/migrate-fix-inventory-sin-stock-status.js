/**
 * Migración: corrige el `status` de lotes de `product_inventory` que quedaron
 * marcados "Disponible" pese a no tener nada libre ni reservado — bug de
 * approveProductTransfer, que nunca marcaba el lote de origen como "Sin
 * stock" al transferir todo su stock afuera (a diferencia de la aprobación
 * de ventas, que sí lo hacía). Ya se corrigió el código para las próximas
 * transferencias; este script solo repara los lotes que quedaron mal ANTES
 * del fix.
 *
 * Alcance: cualquier `product_inventory` con `status: "Disponible"`,
 * `available: 0` y `reserved: 0` — sin importar si quedó así por una
 * transferencia, una venta vieja u otra causa, ese estado siempre debería
 * ser "Sin stock". No toca lotes en "Borrador" (compras/transferencias
 * todavía no aprobadas).
 *
 * Modo de prueba (no escribe nada, solo muestra qué haría):
 *   node scripts/migrate-fix-inventory-sin-stock-status.js --dry-run
 *
 * Ejecución real:
 *   node scripts/migrate-fix-inventory-sin-stock-status.js
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
    const productInventories = db.collection("product_inventories");

    const filter = {
      status: "Disponible",
      available: 0,
      reserved: 0,
    };

    const affected = await productInventories.find(filter).toArray();

    console.log(`Encontrados ${affected.length} lote(s) marcados "Disponible" sin stock ni reserva.`);

    for (const inv of affected) {
      console.log(
        `  ${inv._id} (producto ${inv.product}, almacén ${inv.warehouse}, empresa ${inv.company}): "Disponible" → "Sin stock"`
      );
    }

    if (!DRY_RUN && affected.length > 0) {
      const result = await productInventories.updateMany(filter, { $set: { status: "Sin stock" } });
      console.log(`\nActualizados ${result.modifiedCount} lote(s).`);
    } else {
      console.log(`\n${DRY_RUN ? "[dry run] " : ""}Listo.`);
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
