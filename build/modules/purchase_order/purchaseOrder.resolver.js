"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseOrderResolver = void 0;
const ability_1 = require("../../utils/ability");
const purchaseOrder_service_1 = require("./purchaseOrder.service");
exports.purchaseOrderResolver = {
    Query: {
        async listPurchaseOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Purchase");
            return await (0, purchaseOrder_service_1.findAll)(context.user.companyId, context.user.id);
        },
        async listPurchaseOrderByProduct(_, args, context) {
            return await (0, purchaseOrder_service_1.listPurchaseOrderByProduct)(context.user.companyId, context.user.id, args.productId);
        },
        async listPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Purchase"],
                ["read", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.findDetail)(context.user.companyId, args.purchaseOrderId);
        },
        async findPurchaseOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["read", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.findPurchaseOrder)(context.user.companyId, args.purchaseOrderId);
        },
        async findPurchaseOrderToPDF(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Purchase");
            return await (0, purchaseOrder_service_1.findPurchaseOrderToPDF)(context.user.companyId, args.purchaseOrderId);
        },
        async purchaseOrderReport(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "PurchaseReport");
            return await (0, purchaseOrder_service_1.purchaseOrderReport)(context.user.companyId, context.user.id, args.filterPurchaseOrderInput);
        },
    },
    Mutation: {
        async createPurchaseOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Purchase");
            return await (0, purchaseOrder_service_1.create)(context.user.companyId, context.user.id, args.purchaseOrderInput);
        },
        async createPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.createDetail)(context.user.companyId, args.purchaseOrderDetailInput);
        },
        async updatePurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.updatePurchaseOrderDetail)(context.user.companyId, args.purchaseOrderDetailId, args.updatePurchaseOrderDetailInput);
        },
        async addSerialToPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.addSerialToOrder)(context.user.companyId, args.addSerialToPurchaseOrderDetailInput);
        },
        async deleteSerialToPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.deleteSerialToOrder)(context.user.companyId, args.productSerialId);
        },
        async deleteProductToPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.deleteProductToOrder)(context.user.companyId, args.purchaseOrderDetailId);
        },
        async deletePurchaseOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Purchase");
            return await (0, purchaseOrder_service_1.deletePurchaseOrder)(context.user.companyId, args.purchaseOrderId);
        },
        async approvePurchaseOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.approve)(context.user.companyId, args.purchaseOrderId);
        },
        async addManySerialsToPurchaseOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Purchase"],
                ["update", "Purchase"],
            ]);
            return await (0, purchaseOrder_service_1.addManySerialsToOrder)(context.user.companyId, args.addManySerialsToPurchaseOrderDetailInput);
        },
    },
};
