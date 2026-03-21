/**
 * Script de test de integración de flujo completo.
 *
 * Simula el flujo normal de una empresa ejecutando múltiples ciclos de:
 *   1. Compra (BORRADOR → APROBADO) con productos INDIVIDUAL y SERIALIZADO
 *   2. Venta (BORRADOR → APROBADO) consumiendo stock de ambos tipos
 *   3. Transferencia (BORRADOR → APROBADO) entre dos almacenes
 *
 * Verifica la integridad de stock tras cada operación.
 * NO limpia los datos creados (quedan identificables por el tag TEST_<timestamp>).
 *
 * Uso:
 *   npx ts-node src/scripts/integration-test-flow.ts --company <companyId> [--iterations <n>]
 *
 * Flags:
 *   --company     ID de la empresa de prueba (obligatorio)
 *   --iterations  Número de ciclos compra-venta-transferencia (default: 3)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";

import { stockType } from "../utils/enums/stockType.enum";
import { productInventoryStatus } from "../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../utils/enums/productSerialStatus.enum";
import { paymentMethod } from "../utils/enums/saleOrderPaymentMethod";

import * as BrandService from "../modules/brand/brand.service";
import * as CategoryService from "../modules/category/category.service";
import * as WarehouseService from "../modules/warehouse/warehouse.service";
import * as ProviderService from "../modules/provider/provider.service";
import * as ClientService from "../modules/client/client.service";
import * as ProductService from "../modules/product/product.service";
import * as PurchaseService from "../modules/purchase_order/purchaseOrder.service";
import * as SaleService from "../modules/sale_order/saleOrder.service";
import * as TransferService from "../modules/product_transfer/productTransfer.service";

import { Product } from "../modules/product/product.model";
import { ProductInventory } from "../modules/product/product_inventory.model";
import { ProductSerial } from "../modules/product/product_serial.model";
import { PurchaseOrderDetail } from "../modules/purchase_order/purchase_order_detail.model";
import { SaleOrderDetail } from "../modules/sale_order/sale_order_detail.model";
import { ProductTransferDetail } from "../modules/product_transfer/product_transfer_detail.model";

dotenv.config();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseArgs(): Record<string, string | boolean> {
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

function section(title: string) {
  console.log(`\n${"─".repeat(64)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(64));
}

// ── Integrity check (read-only) ───────────────────────────────────────────────

interface IntegrityIssue {
  productId: string;
  name: string;
  kind: string;
  issue: string;
}

async function checkIntegrity(
  companyObjId: mongoose.Types.ObjectId,
  productIds: mongoose.Types.ObjectId[]
): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  for (const productId of productIds) {
    const product = await Product.findOne({
      _id: productId,
      company: companyObjId,
    }).lean();
    if (!product) continue;

    if (product.stock_type === stockType.INDIVIDUAL) {
      const approvedInvs = await ProductInventory.find({
        company: companyObjId,
        product: productId,
        status: { $ne: productInventoryStatus.BORRADOR },
      }).lean();

      const expected = approvedInvs.reduce(
        (sum, inv) => sum + inv.available + inv.reserved,
        0
      );

      if (product.stock !== expected) {
        issues.push({
          productId: productId.toString(),
          name: product.name,
          kind: "STOCK_MISMATCH",
          issue: `Product.stock=${product.stock} ≠ Σ(available+reserved)=${expected}`,
        });
      }

      for (const inv of approvedInvs) {
        if (inv.available < 0 || inv.reserved < 0) {
          issues.push({
            productId: productId.toString(),
            name: product.name,
            kind: "NEGATIVE_VALUE",
            issue: `ProductInventory ${inv._id}: available=${inv.available} reserved=${inv.reserved}`,
          });
        }
        const total = inv.available + inv.reserved + inv.sold + inv.transferred;
        if (total !== inv.quantity) {
          issues.push({
            productId: productId.toString(),
            name: product.name,
            kind: "INTERNAL_MISMATCH",
            issue: `ProductInventory ${inv._id}: quantity=${inv.quantity} ≠ available+reserved+sold+transferred=${total}`,
          });
        }
      }
    } else if (product.stock_type === stockType.SERIALIZADO) {
      const activeCount = await ProductSerial.countDocuments({
        company: companyObjId,
        product: productId,
        status: {
          $in: [productSerialStatus.DISPONIBLE, productSerialStatus.RESERVADO],
        },
      });

      if (product.stock !== activeCount) {
        issues.push({
          productId: productId.toString(),
          name: product.name,
          kind: "STOCK_MISMATCH",
          issue: `Product.stock=${product.stock} ≠ seriales DISPONIBLE+RESERVADO=${activeCount}`,
        });
      }
    }
  }

  return issues;
}

async function assertIntegrity(
  companyObjId: mongoose.Types.ObjectId,
  productIds: mongoose.Types.ObjectId[],
  checkpoint: string
): Promise<IntegrityIssue[]> {
  const issues = await checkIntegrity(companyObjId, productIds);
  if (issues.length === 0) {
    console.log(`   ✅  [${checkpoint}] Integridad OK`);
  } else {
    console.log(
      `   ❌  [${checkpoint}] ${issues.length} inconsistencia(s):`
    );
    for (const i of issues) {
      console.log(`      ⚠️   [${i.kind}] ${i.name}: ${i.issue}`);
    }
  }
  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const args = parseArgs();
  const companyId = args["company"] as string | undefined;
  const iterations = parseInt((args["iterations"] as string) || "3", 10);

  if (!companyId) {
    console.error("❌  --company es obligatorio.");
    console.error(
      "   Uso: npx ts-node src/scripts/integration-test-flow.ts --company <id>"
    );
    process.exit(1);
  }

  await connectToMongoDB();

  const companyObjId = new mongoose.Types.ObjectId(companyId);
  const fakeUserId = new mongoose.Types.ObjectId(); // solo para created_by
  const tag = `TEST_${Date.now()}`;

  console.log(`\n🧪  Iniciando test de integración`);
  console.log(`🏢  Empresa : ${companyId}`);
  console.log(`🔁  Ciclos  : ${iterations}`);
  console.log(`🏷️   Tag     : ${tag}`);

  const allIssues: IntegrityIssue[] = [];

  // ── SETUP ──────────────────────────────────────────────────────────────────
  section("SETUP — Creando entidades de prueba");

  const brand = await BrandService.create(companyObjId, {
    name: `${tag}_Marca`,
  });
  console.log(`   ✅  Marca      : ${brand.name}`);

  const category = await CategoryService.create(companyObjId, {
    name: `${tag}_Categoria`,
  });
  console.log(`   ✅  Categoría  : ${category.name}`);

  const warehouseA = await WarehouseService.create(companyObjId, {
    name: `${tag}_AlmacenA`,
  });
  console.log(`   ✅  Almacén A  : ${warehouseA.name} (${warehouseA._id})`);

  const warehouseB = await WarehouseService.create(companyObjId, {
    name: `${tag}_AlmacenB`,
  });
  console.log(`   ✅  Almacén B  : ${warehouseB.name} (${warehouseB._id})`);

  const provider = await ProviderService.create(companyObjId, {
    name: `${tag}_Proveedor`,
  });
  console.log(`   ✅  Proveedor  : ${provider.name}`);

  const client = await ClientService.create(companyObjId, {
    fullName: `${tag}_Cliente`,
  });
  console.log(`   ✅  Cliente    : ${client.fullName}`);

  // Productos
  const prodInd1 = await ProductService.createProduct(companyObjId, {
    name: `${tag}_ProdInd1`,
    category: category._id,
    brand: brand._id,
    stock_type: stockType.INDIVIDUAL,
    sale_price: 100,
    min_stock: 0,
    max_stock: 9999,
  });
  console.log(`   ✅  Prod INDIVIDUAL 1: ${prodInd1.name} (${prodInd1._id})`);

  const prodInd2 = await ProductService.createProduct(companyObjId, {
    name: `${tag}_ProdInd2`,
    category: category._id,
    brand: brand._id,
    stock_type: stockType.INDIVIDUAL,
    sale_price: 50,
    min_stock: 0,
    max_stock: 9999,
  });
  console.log(`   ✅  Prod INDIVIDUAL 2: ${prodInd2.name} (${prodInd2._id})`);

  const prodSerial = await ProductService.createProduct(companyObjId, {
    name: `${tag}_ProdSerial`,
    category: category._id,
    brand: brand._id,
    stock_type: stockType.SERIALIZADO,
    sale_price: 200,
    min_stock: 0,
    max_stock: 9999,
  });
  console.log(
    `   ✅  Prod SERIALIZADO : ${prodSerial.name} (${prodSerial._id})`
  );

  const testProductIds = [
    new mongoose.Types.ObjectId(prodInd1._id.toString()),
    new mongoose.Types.ObjectId(prodInd2._id.toString()),
    new mongoose.Types.ObjectId(prodSerial._id.toString()),
  ];

  allIssues.push(
    ...(await assertIntegrity(companyObjId, testProductIds, "POST-SETUP"))
  );

  // Serial tracking: which serial strings are DISPONIBLE in each warehouse
  let serialCounter = 0;
  const nextSerial = () =>
    `${tag}_SN_${String(++serialCounter).padStart(3, "0")}`;

  // Serials currently available in WH_A (after purchase approval, before sale/transfer)
  const serialsInWA: string[] = [];

  // ── ITERATION LOOP ─────────────────────────────────────────────────────────
  for (let iter = 1; iter <= iterations; iter++) {
    section(`CICLO ${iter}/${iterations}`);

    // Quantities per cycle
    const BUY_IND1 = 10;
    const BUY_IND2 = 5;
    const BUY_SERIAL = 2;
    const SELL_IND1 = 3;
    const SELL_IND2 = 2;
    const SELL_SERIAL = 1;
    const TRANSFER_IND1 = 2;
    const TRANSFER_SERIAL = 1;

    // ── COMPRA ───────────────────────────────────────────────────────────────
    console.log(`\n  📦  Compra [ciclo ${iter}]`);

    const purchase = await PurchaseService.create(companyObjId, fakeUserId, {
      date: new Date(),
      provider: provider._id.toString(),
    } as any);
    console.log(`     Creada: ${purchase.code} (${purchase._id})`);

    // INDIVIDUAL 1 → almacén A
    await PurchaseService.createDetail(companyObjId, {
      purchase_order: purchase._id.toString(),
      product: prodInd1._id.toString(),
      purchase_price: 60,
      quantity: BUY_IND1,
      warehouse: warehouseA._id.toString(),
    } as any);
    console.log(`     ✅  ${prodInd1.name} x${BUY_IND1} → AlmacénA`);

    // INDIVIDUAL 2 → almacén A
    await PurchaseService.createDetail(companyObjId, {
      purchase_order: purchase._id.toString(),
      product: prodInd2._id.toString(),
      purchase_price: 30,
      quantity: BUY_IND2,
      warehouse: warehouseA._id.toString(),
    } as any);
    console.log(`     ✅  ${prodInd2.name} x${BUY_IND2} → AlmacénA`);

    // SERIALIZADO (sin warehouse en el detalle)
    await PurchaseService.createDetail(companyObjId, {
      purchase_order: purchase._id.toString(),
      product: prodSerial._id.toString(),
      purchase_price: 120,
      quantity: BUY_SERIAL,
    } as any);
    console.log(`     ✅  ${prodSerial.name} x${BUY_SERIAL} (sin almacén aún)`);

    // Obtener el detalle de compra del producto serializado para agregar seriales
    const serialPurchaseDetail = await PurchaseOrderDetail.findOne({
      company: companyObjId,
      purchase_order: purchase._id,
      product: prodSerial._id,
    }).lean();

    if (!serialPurchaseDetail) {
      throw new Error(
        `[ciclo ${iter}] No se encontró el detalle de compra para el producto serializado`
      );
    }

    // Agregar seriales al detalle de compra (WH_A)
    const newPurchaseSerials: string[] = [];
    for (let s = 0; s < BUY_SERIAL; s++) {
      const sn = nextSerial();
      newPurchaseSerials.push(sn);
      await PurchaseService.addSerialToOrder(companyObjId, {
        purchase_order_detail: serialPurchaseDetail._id.toString(),
        warehouse: warehouseA._id.toString(),
        serial: sn,
      } as any);
      console.log(`     ✅  Serial agregado a compra: ${sn}`);
    }

    // Aprobar compra
    await PurchaseService.approve(companyObjId, purchase._id);
    console.log(`     ✅  Compra aprobada: ${purchase.code}`);

    // Tras aprobar, los seriales pasan a DISPONIBLE en WH_A
    serialsInWA.push(...newPurchaseSerials);

    allIssues.push(
      ...(await assertIntegrity(
        companyObjId,
        testProductIds,
        `POST-COMPRA-${iter}`
      ))
    );

    // ── VENTA ─────────────────────────────────────────────────────────────────
    console.log(`\n  🛒  Venta [ciclo ${iter}]`);

    const sale = await SaleService.create(companyObjId, fakeUserId, {
      date: new Date(),
      client: client._id.toString(),
      payment_method: paymentMethod.CONTADO,
    } as any);
    console.log(`     Creada: ${sale.code} (${sale._id})`);

    // INDIVIDUAL 1 desde AlmacénA
    await SaleService.createDetail(companyObjId, {
      sale_order: sale._id.toString(),
      product: prodInd1._id.toString(),
      sale_price: 100,
      quantity: SELL_IND1,
      warehouse: warehouseA._id.toString(),
    } as any);
    console.log(`     ✅  ${prodInd1.name} x${SELL_IND1} desde AlmacénA`);

    // INDIVIDUAL 2 desde AlmacénA
    await SaleService.createDetail(companyObjId, {
      sale_order: sale._id.toString(),
      product: prodInd2._id.toString(),
      sale_price: 50,
      quantity: SELL_IND2,
      warehouse: warehouseA._id.toString(),
    } as any);
    console.log(`     ✅  ${prodInd2.name} x${SELL_IND2} desde AlmacénA`);

    // SERIALIZADO
    await SaleService.createDetail(companyObjId, {
      sale_order: sale._id.toString(),
      product: prodSerial._id.toString(),
      sale_price: 200,
      quantity: SELL_SERIAL,
    } as any);
    console.log(`     ✅  ${prodSerial.name} x${SELL_SERIAL}`);

    // Obtener detalle de venta del producto serializado
    const serialSaleDetail = await SaleOrderDetail.findOne({
      company: companyObjId,
      sale_order: sale._id,
      product: prodSerial._id,
    }).lean();

    if (!serialSaleDetail) {
      throw new Error(
        `[ciclo ${iter}] No se encontró el detalle de venta para el producto serializado`
      );
    }

    // Asignar un serial (DISPONIBLE en WH_A) a la venta
    const serialToSell = serialsInWA.shift();
    if (!serialToSell) {
      throw new Error(
        `[ciclo ${iter}] No hay seriales disponibles en AlmacénA para vender`
      );
    }

    await SaleService.addSerialToOrder(companyObjId, {
      sale_order_detail: serialSaleDetail._id.toString(),
      serial: serialToSell,
    } as any);
    console.log(`     ✅  Serial asignado a venta: ${serialToSell}`);

    // Aprobar venta
    await SaleService.approve(companyObjId, sale._id);
    console.log(`     ✅  Venta aprobada: ${sale.code}`);
    // serialToSell ahora está VENDIDO, ya no está en serialsInWA

    allIssues.push(
      ...(await assertIntegrity(
        companyObjId,
        testProductIds,
        `POST-VENTA-${iter}`
      ))
    );

    // ── TRANSFERENCIA (AlmacénA → AlmacénB) ──────────────────────────────────
    console.log(`\n  🚚  Transferencia A→B [ciclo ${iter}]`);

    const transfer = await TransferService.create(companyObjId, fakeUserId, {
      date: new Date(),
      origin_warehouse: warehouseA._id.toString(),
      destination_warehouse: warehouseB._id.toString(),
    } as any);
    console.log(`     Creada: ${transfer!.code} (${transfer!._id})`);

    // INDIVIDUAL 1: transfiere 2 unidades de WH_A a WH_B
    await TransferService.createDetail(companyObjId, {
      product_transfer: transfer!._id.toString(),
      product: prodInd1._id.toString(),
      quantity: TRANSFER_IND1,
    } as any);
    console.log(`     ✅  ${prodInd1.name} x${TRANSFER_IND1} (A→B)`);

    // SERIALIZADO: transfiere si hay seriales disponibles en WH_A
    if (serialsInWA.length >= TRANSFER_SERIAL) {
      await TransferService.createDetail(companyObjId, {
        product_transfer: transfer!._id.toString(),
        product: prodSerial._id.toString(),
        quantity: TRANSFER_SERIAL,
      } as any);
      console.log(`     ✅  ${prodSerial.name} x${TRANSFER_SERIAL} (A→B)`);

      // Obtener detalle de transferencia del producto serializado
      const serialTransferDetail = await ProductTransferDetail.findOne({
        company: companyObjId,
        product_transfer: transfer!._id,
        product: prodSerial._id,
      }).lean();

      if (!serialTransferDetail) {
        throw new Error(
          `[ciclo ${iter}] No se encontró el detalle de transferencia para el producto serializado`
        );
      }

      const serialToTransfer = serialsInWA.shift()!;
      await TransferService.addSerialToTransferDetail(companyObjId, {
        product_transfer_detail: serialTransferDetail._id.toString(),
        serial: serialToTransfer,
      } as any);
      console.log(
        `     ✅  Serial asignado a transferencia: ${serialToTransfer}`
      );
      // Tras aprobar la transferencia, este serial pasará a WH_B DISPONIBLE
      // (no lo trackeamos en serialsInWA ya que no vendemos desde WH_B en este script)
    } else {
      console.log(
        `     ⚠️   Sin seriales disponibles en AlmacénA — producto serializado omitido en transferencia`
      );
    }

    // Aprobar transferencia
    await TransferService.approveProductTransfer(companyObjId, transfer!._id);
    console.log(`     ✅  Transferencia aprobada: ${transfer!.code}`);

    allIssues.push(
      ...(await assertIntegrity(
        companyObjId,
        testProductIds,
        `POST-TRANSFERENCIA-${iter}`
      ))
    );
  }

  // ── RESUMEN FINAL ──────────────────────────────────────────────────────────
  section("RESUMEN FINAL");

  console.log(`\n📊  Stock final de productos de prueba:`);
  for (const productId of testProductIds) {
    const p = await Product.findOne({
      _id: productId,
      company: companyObjId,
    }).lean();
    if (p) {
      console.log(`   📦  ${p.name} [${p.stock_type}]: stock=${p.stock}`);
    }
  }

  // Deduplicate issues by (productId + issue string)
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter((i) => {
    const key = `${i.productId}|${i.issue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log();
  if (uniqueIssues.length === 0) {
    console.log(
      `✅  Test completado: ninguna inconsistencia de stock detectada en ${iterations} ciclo(s).`
    );
  } else {
    console.log(
      `❌  Se detectaron ${uniqueIssues.length} inconsistencia(s) a lo largo del test:`
    );
    for (const i of uniqueIssues) {
      console.log(`   ⚠️   [${i.kind}] ${i.name}: ${i.issue}`);
    }
  }

  console.log(`\n🏷️   Datos de prueba creados con tag: ${tag}`);
  console.log(
    `   Filtra en MongoDB con: { name: { $regex: "${tag}" } }\n`
  );

  await mongoose.disconnect();
  process.exit(uniqueIssues.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("❌  Error inesperado:", err);
  mongoose.disconnect();
  process.exit(1);
});
