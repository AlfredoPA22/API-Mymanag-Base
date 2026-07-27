"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("../db");
const stockType_enum_1 = require("../utils/enums/stockType.enum");
const productInventoryStatus_enum_1 = require("../utils/enums/productInventoryStatus.enum");
const productSerialStatus_enum_1 = require("../utils/enums/productSerialStatus.enum");
const saleOrderPaymentMethod_1 = require("../utils/enums/saleOrderPaymentMethod");
const BrandService = __importStar(require("../modules/brand/brand.service"));
const CategoryService = __importStar(require("../modules/category/category.service"));
const WarehouseService = __importStar(require("../modules/warehouse/warehouse.service"));
const ProviderService = __importStar(require("../modules/provider/provider.service"));
const ClientService = __importStar(require("../modules/client/client.service"));
const ProductService = __importStar(require("../modules/product/product.service"));
const PurchaseService = __importStar(require("../modules/purchase_order/purchaseOrder.service"));
const SaleService = __importStar(require("../modules/sale_order/saleOrder.service"));
const TransferService = __importStar(require("../modules/product_transfer/productTransfer.service"));
const product_model_1 = require("../modules/product/product.model");
const product_inventory_model_1 = require("../modules/product/product_inventory.model");
const product_serial_model_1 = require("../modules/product/product_serial.model");
const purchase_order_detail_model_1 = require("../modules/purchase_order/purchase_order_detail.model");
const sale_order_detail_model_1 = require("../modules/sale_order/sale_order_detail.model");
const product_transfer_detail_model_1 = require("../modules/product_transfer/product_transfer_detail.model");
dotenv_1.default.config();
// ── Helpers ───────────────────────────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const key = args[i].slice(2);
            if (args[i + 1] && !args[i + 1].startsWith("--")) {
                result[key] = args[i + 1];
                i++;
            }
            else {
                result[key] = true;
            }
        }
    }
    return result;
}
function section(title) {
    console.log(`\n${"─".repeat(64)}`);
    console.log(`  ${title}`);
    console.log("─".repeat(64));
}
async function checkIntegrity(companyObjId, productIds) {
    const issues = [];
    for (const productId of productIds) {
        const product = await product_model_1.Product.findOne({
            _id: productId,
            company: companyObjId,
        }).lean();
        if (!product)
            continue;
        if (product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
            const approvedInvs = await product_inventory_model_1.ProductInventory.find({
                company: companyObjId,
                product: productId,
                status: { $ne: productInventoryStatus_enum_1.productInventoryStatus.BORRADOR },
            }).lean();
            const expected = approvedInvs.reduce((sum, inv) => sum + inv.available + inv.reserved, 0);
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
        }
        else if (product.stock_type === stockType_enum_1.stockType.SERIALIZADO) {
            const activeCount = await product_serial_model_1.ProductSerial.countDocuments({
                company: companyObjId,
                product: productId,
                status: {
                    $in: [productSerialStatus_enum_1.productSerialStatus.DISPONIBLE, productSerialStatus_enum_1.productSerialStatus.RESERVADO],
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
async function assertIntegrity(companyObjId, productIds, checkpoint) {
    const issues = await checkIntegrity(companyObjId, productIds);
    if (issues.length === 0) {
        console.log(`   ✅  [${checkpoint}] Integridad OK`);
    }
    else {
        console.log(`   ❌  [${checkpoint}] ${issues.length} inconsistencia(s):`);
        for (const i of issues) {
            console.log(`      ⚠️   [${i.kind}] ${i.name}: ${i.issue}`);
        }
    }
    return issues;
}
// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    const args = parseArgs();
    const companyId = args["company"];
    const iterations = parseInt(args["iterations"] || "3", 10);
    if (!companyId) {
        console.error("❌  --company es obligatorio.");
        console.error("   Uso: npx ts-node src/scripts/integration-test-flow.ts --company <id>");
        process.exit(1);
    }
    await (0, db_1.connectToMongoDB)();
    const companyObjId = new mongoose_1.default.Types.ObjectId(companyId);
    const fakeUserId = new mongoose_1.default.Types.ObjectId(); // solo para created_by
    const tag = `TEST_${Date.now()}`;
    console.log(`\n🧪  Iniciando test de integración`);
    console.log(`🏢  Empresa : ${companyId}`);
    console.log(`🔁  Ciclos  : ${iterations}`);
    console.log(`🏷️   Tag     : ${tag}`);
    const allIssues = [];
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
        stock_type: stockType_enum_1.stockType.INDIVIDUAL,
        sale_price: 100,
        min_stock: 0,
        max_stock: 9999,
    });
    console.log(`   ✅  Prod INDIVIDUAL 1: ${prodInd1.name} (${prodInd1._id})`);
    const prodInd2 = await ProductService.createProduct(companyObjId, {
        name: `${tag}_ProdInd2`,
        category: category._id,
        brand: brand._id,
        stock_type: stockType_enum_1.stockType.INDIVIDUAL,
        sale_price: 50,
        min_stock: 0,
        max_stock: 9999,
    });
    console.log(`   ✅  Prod INDIVIDUAL 2: ${prodInd2.name} (${prodInd2._id})`);
    const prodSerial = await ProductService.createProduct(companyObjId, {
        name: `${tag}_ProdSerial`,
        category: category._id,
        brand: brand._id,
        stock_type: stockType_enum_1.stockType.SERIALIZADO,
        sale_price: 200,
        min_stock: 0,
        max_stock: 9999,
    });
    console.log(`   ✅  Prod SERIALIZADO : ${prodSerial.name} (${prodSerial._id})`);
    const testProductIds = [
        new mongoose_1.default.Types.ObjectId(prodInd1._id.toString()),
        new mongoose_1.default.Types.ObjectId(prodInd2._id.toString()),
        new mongoose_1.default.Types.ObjectId(prodSerial._id.toString()),
    ];
    allIssues.push(...(await assertIntegrity(companyObjId, testProductIds, "POST-SETUP")));
    // Serial tracking: which serial strings are DISPONIBLE in each warehouse
    let serialCounter = 0;
    const nextSerial = () => `${tag}_SN_${String(++serialCounter).padStart(3, "0")}`;
    // Serials currently available in WH_A (after purchase approval, before sale/transfer)
    const serialsInWA = [];
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
        });
        console.log(`     Creada: ${purchase.code} (${purchase._id})`);
        // INDIVIDUAL 1 → almacén A
        await PurchaseService.createDetail(companyObjId, {
            purchase_order: purchase._id.toString(),
            product: prodInd1._id.toString(),
            purchase_price: 60,
            quantity: BUY_IND1,
            warehouse: warehouseA._id.toString(),
        });
        console.log(`     ✅  ${prodInd1.name} x${BUY_IND1} → AlmacénA`);
        // INDIVIDUAL 2 → almacén A
        await PurchaseService.createDetail(companyObjId, {
            purchase_order: purchase._id.toString(),
            product: prodInd2._id.toString(),
            purchase_price: 30,
            quantity: BUY_IND2,
            warehouse: warehouseA._id.toString(),
        });
        console.log(`     ✅  ${prodInd2.name} x${BUY_IND2} → AlmacénA`);
        // SERIALIZADO (sin warehouse en el detalle)
        await PurchaseService.createDetail(companyObjId, {
            purchase_order: purchase._id.toString(),
            product: prodSerial._id.toString(),
            purchase_price: 120,
            quantity: BUY_SERIAL,
        });
        console.log(`     ✅  ${prodSerial.name} x${BUY_SERIAL} (sin almacén aún)`);
        // Obtener el detalle de compra del producto serializado para agregar seriales
        const serialPurchaseDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
            company: companyObjId,
            purchase_order: purchase._id,
            product: prodSerial._id,
        }).lean();
        if (!serialPurchaseDetail) {
            throw new Error(`[ciclo ${iter}] No se encontró el detalle de compra para el producto serializado`);
        }
        // Agregar seriales al detalle de compra (WH_A)
        const newPurchaseSerials = [];
        for (let s = 0; s < BUY_SERIAL; s++) {
            const sn = nextSerial();
            newPurchaseSerials.push(sn);
            await PurchaseService.addSerialToOrder(companyObjId, {
                purchase_order_detail: serialPurchaseDetail._id.toString(),
                warehouse: warehouseA._id.toString(),
                serial: sn,
            });
            console.log(`     ✅  Serial agregado a compra: ${sn}`);
        }
        // Aprobar compra
        await PurchaseService.approve(companyObjId, purchase._id);
        console.log(`     ✅  Compra aprobada: ${purchase.code}`);
        // Tras aprobar, los seriales pasan a DISPONIBLE en WH_A
        serialsInWA.push(...newPurchaseSerials);
        allIssues.push(...(await assertIntegrity(companyObjId, testProductIds, `POST-COMPRA-${iter}`)));
        // ── VENTA ─────────────────────────────────────────────────────────────────
        console.log(`\n  🛒  Venta [ciclo ${iter}]`);
        const sale = await SaleService.create(companyObjId, fakeUserId, {
            date: new Date(),
            client: client._id.toString(),
            payment_method: saleOrderPaymentMethod_1.paymentMethod.CONTADO,
        });
        console.log(`     Creada: ${sale.code} (${sale._id})`);
        // INDIVIDUAL 1 desde AlmacénA
        await SaleService.createDetail(companyObjId, {
            sale_order: sale._id.toString(),
            product: prodInd1._id.toString(),
            sale_price: 100,
            quantity: SELL_IND1,
            warehouse: warehouseA._id.toString(),
        });
        console.log(`     ✅  ${prodInd1.name} x${SELL_IND1} desde AlmacénA`);
        // INDIVIDUAL 2 desde AlmacénA
        await SaleService.createDetail(companyObjId, {
            sale_order: sale._id.toString(),
            product: prodInd2._id.toString(),
            sale_price: 50,
            quantity: SELL_IND2,
            warehouse: warehouseA._id.toString(),
        });
        console.log(`     ✅  ${prodInd2.name} x${SELL_IND2} desde AlmacénA`);
        // SERIALIZADO
        await SaleService.createDetail(companyObjId, {
            sale_order: sale._id.toString(),
            product: prodSerial._id.toString(),
            sale_price: 200,
            quantity: SELL_SERIAL,
        });
        console.log(`     ✅  ${prodSerial.name} x${SELL_SERIAL}`);
        // Obtener detalle de venta del producto serializado
        const serialSaleDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
            company: companyObjId,
            sale_order: sale._id,
            product: prodSerial._id,
        }).lean();
        if (!serialSaleDetail) {
            throw new Error(`[ciclo ${iter}] No se encontró el detalle de venta para el producto serializado`);
        }
        // Asignar un serial (DISPONIBLE en WH_A) a la venta
        const serialToSell = serialsInWA.shift();
        if (!serialToSell) {
            throw new Error(`[ciclo ${iter}] No hay seriales disponibles en AlmacénA para vender`);
        }
        await SaleService.addSerialToOrder(companyObjId, {
            sale_order_detail: serialSaleDetail._id.toString(),
            serial: serialToSell,
        });
        console.log(`     ✅  Serial asignado a venta: ${serialToSell}`);
        // Aprobar venta
        await SaleService.approve(companyObjId, sale._id);
        console.log(`     ✅  Venta aprobada: ${sale.code}`);
        // serialToSell ahora está VENDIDO, ya no está en serialsInWA
        allIssues.push(...(await assertIntegrity(companyObjId, testProductIds, `POST-VENTA-${iter}`)));
        // ── TRANSFERENCIA (AlmacénA → AlmacénB) ──────────────────────────────────
        console.log(`\n  🚚  Transferencia A→B [ciclo ${iter}]`);
        const transfer = await TransferService.create(companyObjId, fakeUserId, {
            date: new Date(),
            origin_warehouse: warehouseA._id.toString(),
            destination_warehouse: warehouseB._id.toString(),
        });
        console.log(`     Creada: ${transfer.code} (${transfer._id})`);
        // INDIVIDUAL 1: transfiere 2 unidades de WH_A a WH_B
        await TransferService.createDetail(companyObjId, {
            product_transfer: transfer._id.toString(),
            product: prodInd1._id.toString(),
            quantity: TRANSFER_IND1,
        });
        console.log(`     ✅  ${prodInd1.name} x${TRANSFER_IND1} (A→B)`);
        // SERIALIZADO: transfiere si hay seriales disponibles en WH_A
        if (serialsInWA.length >= TRANSFER_SERIAL) {
            await TransferService.createDetail(companyObjId, {
                product_transfer: transfer._id.toString(),
                product: prodSerial._id.toString(),
                quantity: TRANSFER_SERIAL,
            });
            console.log(`     ✅  ${prodSerial.name} x${TRANSFER_SERIAL} (A→B)`);
            // Obtener detalle de transferencia del producto serializado
            const serialTransferDetail = await product_transfer_detail_model_1.ProductTransferDetail.findOne({
                company: companyObjId,
                product_transfer: transfer._id,
                product: prodSerial._id,
            }).lean();
            if (!serialTransferDetail) {
                throw new Error(`[ciclo ${iter}] No se encontró el detalle de transferencia para el producto serializado`);
            }
            const serialToTransfer = serialsInWA.shift();
            await TransferService.addSerialToTransferDetail(companyObjId, {
                product_transfer_detail: serialTransferDetail._id.toString(),
                serial: serialToTransfer,
            });
            console.log(`     ✅  Serial asignado a transferencia: ${serialToTransfer}`);
            // Tras aprobar la transferencia, este serial pasará a WH_B DISPONIBLE
            // (no lo trackeamos en serialsInWA ya que no vendemos desde WH_B en este script)
        }
        else {
            console.log(`     ⚠️   Sin seriales disponibles en AlmacénA — producto serializado omitido en transferencia`);
        }
        // Aprobar transferencia
        await TransferService.approveProductTransfer(companyObjId, transfer._id);
        console.log(`     ✅  Transferencia aprobada: ${transfer.code}`);
        allIssues.push(...(await assertIntegrity(companyObjId, testProductIds, `POST-TRANSFERENCIA-${iter}`)));
    }
    // ── RESUMEN FINAL ──────────────────────────────────────────────────────────
    section("RESUMEN FINAL");
    console.log(`\n📊  Stock final de productos de prueba:`);
    for (const productId of testProductIds) {
        const p = await product_model_1.Product.findOne({
            _id: productId,
            company: companyObjId,
        }).lean();
        if (p) {
            console.log(`   📦  ${p.name} [${p.stock_type}]: stock=${p.stock}`);
        }
    }
    // Deduplicate issues by (productId + issue string)
    const seen = new Set();
    const uniqueIssues = allIssues.filter((i) => {
        const key = `${i.productId}|${i.issue}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    console.log();
    if (uniqueIssues.length === 0) {
        console.log(`✅  Test completado: ninguna inconsistencia de stock detectada en ${iterations} ciclo(s).`);
    }
    else {
        console.log(`❌  Se detectaron ${uniqueIssues.length} inconsistencia(s) a lo largo del test:`);
        for (const i of uniqueIssues) {
            console.log(`   ⚠️   [${i.kind}] ${i.name}: ${i.issue}`);
        }
    }
    console.log(`\n🏷️   Datos de prueba creados con tag: ${tag}`);
    console.log(`   Filtra en MongoDB con: { name: { $regex: "${tag}" } }\n`);
    await mongoose_1.default.disconnect();
    process.exit(uniqueIssues.length > 0 ? 1 : 0);
}
run().catch((err) => {
    console.error("❌  Error inesperado:", err);
    mongoose_1.default.disconnect();
    process.exit(1);
});
