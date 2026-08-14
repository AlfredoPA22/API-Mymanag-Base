"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productResolver = void 0;
const product_service_1 = require("./product.service");
const ability_1 = require("../../utils/ability");
exports.productResolver = {
    Query: {
        async listProduct(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Product"],
                ["list", "Purchase"],
                ["list", "Sale"],
                ["update", "Sale"],
                ["update", "Purchase"],
            ]);
            return await (0, product_service_1.findAll)(context.user.companyId);
        },
        async listLowStockProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Product");
            return await (0, product_service_1.listLowStockProduct)(context.user.companyId);
        },
        async listProductWithParams(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Product"],
                ["list", "Brand"],
                ["list", "Category"],
                ["list", "Warehouse"],
            ]);
            return await (0, product_service_1.findAllWithParams)(context.user.companyId, args.categoryId, args.brandId, args.warehouseId);
        },
        async findProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "Product");
            return await (0, product_service_1.findProduct)(context.user.companyId, args.productId);
        },
        async listProductSerialByPurchaseOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Purchase"],
                ["update", "Purchase"],
                ["read", "Purchase"],
            ]);
            return await (0, product_service_1.listProductSerialByPurchaseOrder)(context.user.companyId, args.purchaseOrderDetailId);
        },
        async listProductSerialBySaleOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Sale"],
                ["update", "Sale"],
                ["read", "Sale"],
            ]);
            return await (0, product_service_1.listProductSerialBySaleOrder)(context.user.companyId, args.saleOrderDetailId);
        },
        async listProductSerialByProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "listSerials", "Product");
            return await (0, product_service_1.listProductSerialByProduct)(context.user.companyId, args.productId);
        },
        async listProductInventoryByProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "listInventory", "Product");
            return await (0, product_service_1.listProductInventoryByProduct)(context.user.companyId, args.productId);
        },
        async searchProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "search", "Product");
            return await (0, product_service_1.searchProduct)(context.user.companyId, args.serial, args.exact);
        },
        async generalData(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "GeneralData");
            return await (0, product_service_1.generalData)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async productReport(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ProductReport");
            return await (0, product_service_1.productReport)(context.user.companyId, args.filterProductInput);
        },
    },
    Mutation: {
        async createProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Product");
            return await (0, product_service_1.createProduct)(context.user.companyId, args.productInput);
        },
        async deleteProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Product");
            return await (0, product_service_1.deleteProduct)(context.user.companyId, args.productId);
        },
        async updateProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Product");
            return await (0, product_service_1.update)(context.user.companyId, args.productId, args.updateProductInput);
        },
        async saveImportProducts(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Product");
            return await (0, product_service_1.saveImportProducts)(context.user.companyId, args.importProducts);
        },
    },
};
