/**
 * Migración: agrega el permiso VIEW_PRODUCT_COST a los roles administradores
 * existentes — se usó para gatear el costo en la nueva pestaña "Fuera de
 * inventario" (Productos), pero los roles creados antes de VIEW_PRODUCT_COST
 * existir no lo tienen todavía.
 *
 * Alcance: cualquier rol que ya tenga el permiso USER_AND_ROLE (gestionar
 * usuarios y roles) se asume "administrador" de su empresa, sin depender de
 * que el rol se llame exactamente "Administrador" (pudo haber sido renombrado).
 *
 * Modo de prueba (no escribe nada, solo muestra qué haría):
 *   node scripts/migrate-add-view-product-cost-permission.js --dry-run
 *
 * Ejecución real:
 *   node scripts/migrate-add-view-product-cost-permission.js
 *
 * Requiere MONGODB_URI en .env (o en el entorno antes de correrlo).
 *
 * Importante: después de correrlo, los administradores ya logueados no ven
 * el cambio hasta que vuelvan a iniciar sesión (los permisos viajan en el
 * JWT, que dura 1 día) — avisales que cierren sesión y vuelvan a entrar.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const NEW_PERMISSIONS = ["VIEW_PRODUCT_COST"];

const ADMIN_MARKER_PERMISSION = "USER_AND_ROLE";

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? " (dry run — no se escribirá nada)" : ""}`);

  try {
    const db = mongoose.connection.db;
    const roles = db.collection("roles");

    // OJO: el campo en el schema de Mongoose es "permission" (singular),
    // no "permissions".
    const adminRoles = await roles
      .find({ permission: ADMIN_MARKER_PERMISSION })
      .toArray();

    console.log(`Encontrados ${adminRoles.length} rol(es) con ${ADMIN_MARKER_PERMISSION}`);

    let totalUpdated = 0;
    let totalAlreadyOk = 0;

    for (const role of adminRoles) {
      const currentPerms = role.permission ?? [];
      const missing = NEW_PERMISSIONS.filter((p) => !currentPerms.includes(p));

      if (missing.length === 0) {
        totalAlreadyOk++;
        continue;
      }

      const newPerms = [...new Set([...currentPerms, ...missing])];

      console.log(
        `  Rol "${role.name}" (${role._id}, empresa ${role.company}): agrega [${missing.join(", ")}]`
      );

      if (!DRY_RUN) {
        await roles.updateOne({ _id: role._id }, { $set: { permission: newPerms } });
      }
      totalUpdated++;
    }

    console.log(
      `\n${DRY_RUN ? "[dry run] " : ""}Listo. ${totalUpdated} rol(es) actualizado(s), ${totalAlreadyOk} ya tenían todo.`
    );
    if (!DRY_RUN && totalUpdated > 0) {
      console.log(
        "Recordá avisar a los administradores afectados que cierren sesión y vuelvan a entrar para ver el cambio."
      );
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
