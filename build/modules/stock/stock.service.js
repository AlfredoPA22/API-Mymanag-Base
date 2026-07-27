"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStock = exports.auditStock = void 0;
const user_landing_model_1 = require("../user_landing/user_landing.model");
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const company_model_1 = require("../company/company.model");
async function verifyAdmin(userId) {
    const user = await user_landing_model_1.UserLanding.findById(userId);
    if (!user)
        throw new Error("Usuario no encontrado");
    if (user.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("Acceso denegado: solo para administradores");
    }
}
async function calculateCorrectStock(product) {
    if (product.stock_type === "individual") {
        const result = await product_inventory_model_1.ProductInventory.aggregate([
            {
                $match: {
                    product: product._id,
                    status: { $in: ["Disponible", "Sin stock"] },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $add: ["$available", "$reserved"] } },
                },
            },
        ]);
        return result[0]?.total ?? 0;
    }
    else if (product.stock_type === "serializado") {
        return product_serial_model_1.ProductSerial.countDocuments({
            product: product._id,
            status: { $in: ["Disponible", "Reservado"] },
        });
    }
    return 0;
}
// Build a map of companyId -> companyName for display
async function buildCompanyMap() {
    const companies = await company_model_1.Company.find({}, { _id: 1, name: 1 }).lean();
    const map = new Map();
    for (const c of companies) {
        map.set(c._id.toString(), c.name ?? "—");
    }
    return map;
}
const auditStock = async (userId) => {
    await verifyAdmin(userId);
    const products = await product_model_1.Product.find({}).lean();
    const companyMap = await buildCompanyMap();
    let ok = 0;
    let errors = 0;
    const discrepancies = [];
    for (const product of products) {
        try {
            const correctStock = await calculateCorrectStock(product);
            const correctStatus = correctStock > 0 ? "Disponible" : "Sin stock";
            const stockOk = product.stock === correctStock;
            const statusOk = product.status === correctStatus;
            if (stockOk && statusOk) {
                ok++;
            }
            else {
                const companyIdStr = product.company?.toString() ?? "";
                discrepancies.push({
                    productId: product._id.toString(),
                    code: product.code ?? "—",
                    name: product.name ?? "—",
                    stock_type: product.stock_type ?? "—",
                    companyId: companyIdStr,
                    companyName: companyMap.get(companyIdStr) ?? "—",
                    stockActual: product.stock ?? 0,
                    stockCorrecto: correctStock,
                    statusActual: product.status ?? "—",
                    statusCorrecto: correctStatus,
                    diff: correctStock - (product.stock ?? 0),
                });
            }
        }
        catch (err) {
            errors++;
            console.error(`⚠️ Error auditando producto ${product._id}:`, err.message);
        }
    }
    return {
        totalProducts: products.length,
        ok,
        discrepancies,
        errors,
    };
};
exports.auditStock = auditStock;
const reconcileStock = async (userId) => {
    await verifyAdmin(userId);
    const products = await product_model_1.Product.find({}).lean();
    const companyMap = await buildCompanyMap();
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    const changes = [];
    for (const product of products) {
        try {
            const correctStock = await calculateCorrectStock(product);
            const correctStatus = correctStock > 0 ? "Disponible" : "Sin stock";
            const stockChanged = product.stock !== correctStock;
            const statusChanged = product.status !== correctStatus;
            if (!stockChanged && !statusChanged) {
                unchanged++;
                continue;
            }
            await product_model_1.Product.updateOne({ _id: product._id }, { $set: { stock: correctStock, status: correctStatus } });
            const companyIdStr = product.company?.toString() ?? "";
            changes.push({
                productId: product._id.toString(),
                name: product.name ?? "—",
                companyId: companyIdStr,
                companyName: companyMap.get(companyIdStr) ?? "—",
                stock_type: product.stock_type ?? "—",
                stockBefore: product.stock ?? 0,
                stockAfter: correctStock,
                statusBefore: product.status ?? "—",
                statusAfter: correctStatus,
            });
            updated++;
        }
        catch (err) {
            errors++;
            console.error(`⚠️ Error reconciliando producto ${product._id}:`, err.message);
        }
    }
    return {
        totalProducts: products.length,
        updated,
        unchanged,
        errors,
        changes,
    };
};
exports.reconcileStock = reconcileStock;
