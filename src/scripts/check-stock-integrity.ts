/**
 * Script de diagnóstico de integridad de stock.
 *
 * Compara el campo `stock` de cada producto contra lo que realmente
 * registran sus ProductInventory o ProductSerial según el tipo de stock.
 * NO modifica nada en la base de datos.
 *
 * Uso:
 *   npx ts-node src/scripts/check-stock-integrity.ts --company <companyId>
 *
 * Flags:
 *   --company  ID de la empresa a analizar (obligatorio)
 *   --verbose  Muestra también los productos sin descompaginación
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";
import { Product } from "../modules/product/product.model";
import { ProductInventory } from "../modules/product/product_inventory.model";
import { ProductSerial } from "../modules/product/product_serial.model";
import { stockType } from "../utils/enums/stockType.enum";
import { productInventoryStatus } from "../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../utils/enums/productSerialStatus.enum";

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

interface Issue {
  type: string;
  detail: string;
}

interface ProductReport {
  productId: string;
  name: string;
  stockType: string;
  stockEnBD: number;
  stockEsperado: number;
  issues: Issue[];
}

async function run() {
  const args = parseArgs();
  const companyId = args["company"] as string | undefined;
  const verbose = args["verbose"] === true;

  if (!companyId) {
    console.error("❌  --company es obligatorio.");
    console.error("   Uso: npx ts-node src/scripts/check-stock-integrity.ts --company <id>");
    process.exit(1);
  }

  await connectToMongoDB();

  const companyObjId = new mongoose.Types.ObjectId(companyId);

  const products = await Product.find({ company: companyObjId }).lean();
  console.log(`\n🏢  Empresa: ${companyId}`);
  console.log(`📦  Productos a analizar: ${products.length}\n`);

  const reports: ProductReport[] = [];

  for (const product of products) {
    const issues: Issue[] = [];
    let expectedStock = 0;

    if (product.stock_type === stockType.INDIVIDUAL) {
      // ── INDIVIDUAL ──────────────────────────────────────────────────────────

      const inventories = await ProductInventory.find({
        company: companyObjId,
        product: product._id,
      }).lean();

      // Stock esperado = suma de (available + reserved) en inventarios DISPONIBLE o SIN_STOCK
      // Los BORRADOR no cuentan porque la compra aún no fue aprobada
      const approvedInventories = inventories.filter(
        (inv) => inv.status !== productInventoryStatus.BORRADOR
      );
      const draftInventories = inventories.filter(
        (inv) => inv.status === productInventoryStatus.BORRADOR
      );

      expectedStock = approvedInventories.reduce(
        (sum, inv) => sum + inv.available + inv.reserved,
        0
      );

      // 1. Stock del producto vs suma de inventarios aprobados
      if (product.stock !== expectedStock) {
        issues.push({
          type: "STOCK_MISMATCH",
          detail: `Product.stock=${product.stock} ≠ suma(available+reserved) en inventarios aprobados=${expectedStock}`,
        });
      }

      // 2. Consistencia interna de cada ProductInventory
      for (const inv of inventories) {
        const internalSum = inv.available + inv.reserved + inv.sold + inv.transferred;
        if (internalSum !== inv.quantity) {
          issues.push({
            type: "INVENTORY_INTERNAL_MISMATCH",
            detail: `ProductInventory ${inv._id}: quantity=${inv.quantity} ≠ available(${inv.available})+reserved(${inv.reserved})+sold(${inv.sold})+transferred(${inv.transferred})=${internalSum}`,
          });
        }
      }

      // 3. available < 0 o reserved < 0
      for (const inv of inventories) {
        if (inv.available < 0) {
          issues.push({
            type: "NEGATIVE_AVAILABLE",
            detail: `ProductInventory ${inv._id}: available=${inv.available} es negativo`,
          });
        }
        if (inv.reserved < 0) {
          issues.push({
            type: "NEGATIVE_RESERVED",
            detail: `ProductInventory ${inv._id}: reserved=${inv.reserved} es negativo`,
          });
        }
        if (inv.sold < 0) {
          issues.push({
            type: "NEGATIVE_SOLD",
            detail: `ProductInventory ${inv._id}: sold=${inv.sold} es negativo`,
          });
        }
      }

      // 4. Estado inconsistente del inventario
      for (const inv of approvedInventories) {
        const hasActiveStock = inv.available > 0 || inv.reserved > 0;
        if (inv.status === productInventoryStatus.SIN_STOCK && hasActiveStock) {
          issues.push({
            type: "STATUS_MISMATCH",
            detail: `ProductInventory ${inv._id}: status=SIN_STOCK pero available=${inv.available} reserved=${inv.reserved}`,
          });
        }
        if (inv.status === productInventoryStatus.DISPONIBLE && !hasActiveStock && inv.sold === 0 && inv.transferred === 0) {
          issues.push({
            type: "STATUS_MISMATCH",
            detail: `ProductInventory ${inv._id}: status=DISPONIBLE pero todos los campos son 0`,
          });
        }
      }

      // 5. Inventarios en BORRADOR con cantidad > 0 sin compra pendiente (informativo)
      if (draftInventories.length > 0) {
        const draftTotal = draftInventories.reduce((sum, inv) => sum + inv.quantity, 0);
        issues.push({
          type: "DRAFT_INVENTORIES",
          detail: `${draftInventories.length} ProductInventory(s) en BORRADOR con ${draftTotal} unidades (compra(s) pendiente de aprobación — no es un error si hay compras en borrador)`,
        });
      }

      // 6. Sin ningún ProductInventory pero con stock > 0
      if (inventories.length === 0 && product.stock > 0) {
        issues.push({
          type: "STOCK_WITHOUT_INVENTORY",
          detail: `Product.stock=${product.stock} pero no existe ningún ProductInventory`,
        });
      }

    } else if (product.stock_type === stockType.SERIALIZADO) {
      // ── SERIALIZADO ──────────────────────────────────────────────────────────

      const activeSerials = await ProductSerial.countDocuments({
        company: companyObjId,
        product: product._id,
        status: { $in: [productSerialStatus.DISPONIBLE, productSerialStatus.RESERVADO] },
      });

      const draftSerials = await ProductSerial.countDocuments({
        company: companyObjId,
        product: product._id,
        status: productSerialStatus.BORRADOR,
      });

      const soldSerials = await ProductSerial.countDocuments({
        company: companyObjId,
        product: product._id,
        status: productSerialStatus.VENDIDO,
      });

      expectedStock = activeSerials;

      // 1. Stock del producto vs seriales activos (DISPONIBLE + RESERVADO)
      if (product.stock !== expectedStock) {
        issues.push({
          type: "STOCK_MISMATCH",
          detail: `Product.stock=${product.stock} ≠ seriales DISPONIBLE+RESERVADO=${expectedStock} (vendidos=${soldSerials}, borradores=${draftSerials})`,
        });
      }

      // 2. Sin seriales pero con stock > 0
      const totalSerials = await ProductSerial.countDocuments({
        company: companyObjId,
        product: product._id,
      });

      if (totalSerials === 0 && product.stock > 0) {
        issues.push({
          type: "STOCK_WITHOUT_SERIALS",
          detail: `Product.stock=${product.stock} pero no existe ningún ProductSerial`,
        });
      }

      // 3. Seriales en BORRADOR (compras pendientes — informativo)
      if (draftSerials > 0) {
        issues.push({
          type: "DRAFT_SERIALS",
          detail: `${draftSerials} serial(es) en BORRADOR (compra(s) pendiente de aprobación — no es un error si hay compras en borrador)`,
        });
      }
    }

    const report: ProductReport = {
      productId: product._id.toString(),
      name: product.name,
      stockType: product.stock_type,
      stockEnBD: product.stock,
      stockEsperado: expectedStock,
      issues,
    };

    reports.push(report);
  }

  // ── Filtrar y mostrar ────────────────────────────────────────────────────

  const realIssueTypes = ["STOCK_MISMATCH", "INVENTORY_INTERNAL_MISMATCH", "NEGATIVE_AVAILABLE", "NEGATIVE_RESERVED", "NEGATIVE_SOLD", "STATUS_MISMATCH", "STOCK_WITHOUT_INVENTORY", "STOCK_WITHOUT_SERIALS"];
  const infoIssueTypes = ["DRAFT_INVENTORIES", "DRAFT_SERIALS"];

  const withRealIssues = reports.filter((r) =>
    r.issues.some((i) => realIssueTypes.includes(i.type))
  );
  const withInfoOnly = reports.filter(
    (r) =>
      !r.issues.some((i) => realIssueTypes.includes(i.type)) &&
      r.issues.some((i) => infoIssueTypes.includes(i.type))
  );
  const clean = reports.filter((r) => r.issues.length === 0);

  if (withRealIssues.length === 0) {
    console.log("✅  No se encontraron descompaginaciones de stock.\n");
  } else {
    console.log(`❌  ${withRealIssues.length} producto(s) con descompaginación:\n`);
    for (const r of withRealIssues) {
      console.log(`   📦  ${r.name} (${r.productId}) [${r.stockType}]`);
      console.log(`       stock en BD: ${r.stockEnBD}  |  stock esperado: ${r.stockEsperado}`);
      for (const issue of r.issues.filter((i) => realIssueTypes.includes(i.type))) {
        console.log(`       ⚠️   [${issue.type}] ${issue.detail}`);
      }
      console.log();
    }
  }

  if (withInfoOnly.length > 0) {
    console.log(`ℹ️   ${withInfoOnly.length} producto(s) con borradores pendientes (no son errores):`);
    for (const r of withInfoOnly) {
      console.log(`   📦  ${r.name} — ${r.issues.map((i) => i.detail).join(" | ")}`);
    }
    console.log();
  }

  if (verbose) {
    console.log(`✅  ${clean.length} producto(s) sin problemas.`);
  }

  console.log(`\n📊  Resumen:`);
  console.log(`   Descompaginados : ${withRealIssues.length}`);
  console.log(`   Con borradores  : ${withInfoOnly.length}`);
  console.log(`   Sin problemas   : ${clean.length}`);
  console.log(`   Total           : ${reports.length}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Error inesperado:", err);
  mongoose.disconnect();
  process.exit(1);
});
