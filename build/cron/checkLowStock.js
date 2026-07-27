"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLowStockCron = exports.checkLowStock = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const company_model_1 = require("../modules/company/company.model");
const product_model_1 = require("../modules/product/product.model");
const user_landing_model_1 = require("../modules/user_landing/user_landing.model");
const companyStatus_enum_1 = require("../utils/enums/companyStatus.enum");
const sendLowStockEmail_1 = require("../utils/sendLowStockEmail");
const notification_service_1 = require("../modules/notification/notification.service");
const checkLowStock = async () => {
    // Solo empresas activas — no tiene sentido alertar a empresas expiradas o suspendidas
    const companies = await company_model_1.Company.find({ status: companyStatus_enum_1.companyStatus.ACTIVE }).lean();
    let totalAlertas = 0;
    for (const company of companies) {
        try {
            const lowStockProducts = await product_model_1.Product.find({
                company: company._id,
                $expr: { $lte: ["$stock", "$min_stock"] },
            })
                .select("code name stock min_stock")
                .lean();
            if (lowStockProducts.length === 0)
                continue;
            const creator = await user_landing_model_1.UserLanding.findById(company.created_by)
                .select("email")
                .lean();
            if (!creator || !creator.email) {
                console.warn(`⚠️ No se encontró email para la empresa: ${company.name}`);
                continue;
            }
            const products = lowStockProducts.map((p) => ({
                code: p.code,
                name: p.name,
                stock: p.stock,
                min_stock: p.min_stock,
            }));
            await (0, sendLowStockEmail_1.sendLowStockEmail)(creator.email, company.name, products);
            await (0, notification_service_1.createNotification)(company._id, {
                type: "low_stock",
                title: "Stock bajo",
                message: `${products.length} producto${products.length > 1 ? "s" : ""} con stock bajo o agotado.`,
                link: "/inventario/productos",
            });
            totalAlertas++;
        }
        catch (error) {
            console.error(`❌ Error procesando alerta de stock para empresa ${company.name}:`, error instanceof Error ? error.message : String(error));
        }
    }
    if (totalAlertas === 0) {
        console.log("✅ Verificación de stock completada — ninguna empresa con stock bajo");
    }
    else {
        console.log(`✅ Verificación de stock completada — alertas enviadas a ${totalAlertas} empresa${totalAlertas > 1 ? "s" : ""}`);
    }
};
exports.checkLowStock = checkLowStock;
// Ejecutar todos los días a las 08:00 am
const initLowStockCron = () => {
    node_cron_1.default.schedule("0 8 * * *", async () => {
        console.log("🕗 Ejecutando verificación de stock bajo...");
        await (0, exports.checkLowStock)();
    }, {
        timezone: "America/La_Paz",
    });
};
exports.initLowStockCron = initLowStockCron;
