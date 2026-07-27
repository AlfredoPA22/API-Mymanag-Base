"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saleOrderResolver = void 0;
const ability_1 = require("../../utils/ability");
const saleOrder_service_1 = require("./saleOrder.service");
exports.saleOrderResolver = {
    Query: {
        async listSaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Sale");
            return await (0, saleOrder_service_1.findAll)(context.user.companyId, context.user.id);
        },
        async listStoreOrders(_, args, context) {
            // Acceso también permitido con el permiso de Empresa: quien administra
            // la tienda online (aunque no tenga permiso de Ventas) debe poder ver
            // sus propios pedidos, sin necesitar un permiso nuevo.
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Sale"],
                ["update", "Company"],
            ]);
            return await (0, saleOrder_service_1.findAll)(context.user.companyId, context.user.id, "tienda_online");
        },
        async storeOrderStats(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Sale"],
                ["update", "Company"],
            ]);
            return await (0, saleOrder_service_1.getStoreOrderStats)(context.user.companyId);
        },
        async listSaleOrderByProduct(_, args, context) {
            return await (0, saleOrder_service_1.listSaleOrderByProduct)(context.user.companyId, context.user.id, args.productId);
        },
        async findSaleOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["read", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.findSaleOrder)(context.user.companyId, args.saleOrderId);
        },
        async listSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Sale"],
                ["read", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.findDetail)(context.user.companyId, args.saleOrderId);
        },
        async findSaleOrderToPDF(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Sale");
            return await (0, saleOrder_service_1.findSaleOrderToPDF)(context.user.companyId, args.saleOrderId);
        },
        async findQrPaymentInfoBySaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Sale");
            return await (0, saleOrder_service_1.findQrPaymentInfoBySaleOrder)(context.user.companyId, args.saleOrderId);
        },
        async reportSaleOrderByClient(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportByClient");
            return await (0, saleOrder_service_1.reportSaleOrderByClient)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async reportSaleOrderBySeller(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportBySeller");
            return await (0, saleOrder_service_1.reportSaleOrderBySeller)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async reportSaleOrderByCategory(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportByCategory");
            return await (0, saleOrder_service_1.reportSaleOrderByCategory)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async reportSaleOrderByProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportByProduct");
            return await (0, saleOrder_service_1.reportSaleOrderByProduct)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async reportMonthlySales(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportByMonth");
            return await (0, saleOrder_service_1.reportMonthlySales)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async reportSaleOrderByMonth(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ReportByMonth");
            return await (0, saleOrder_service_1.reportSaleOrderByMonth)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
        async saleOrderReport(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "SaleReport");
            return await (0, saleOrder_service_1.saleOrderReport)(context.user.companyId, context.user.id, args.filterSaleOrderInput);
        },
        async reportCuentasCobrar(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "SaleReport");
            return await (0, saleOrder_service_1.reportCuentasCobrar)(context.user.companyId, context.user.id, args.startDate, args.endDate);
        },
    },
    Mutation: {
        async createSaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Sale");
            return await (0, saleOrder_service_1.create)(context.user.companyId, context.user.id, args.saleOrderInput);
        },
        async deleteSaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Sale");
            return await (0, saleOrder_service_1.deleteSaleOrder)(context.user.companyId, args.saleOrderId);
        },
        async createSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.createDetail)(context.user.companyId, args.saleOrderDetailInput);
        },
        async updateSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.updateSaleOrderDetail)(context.user.companyId, args.saleOrderDetailId, args.updateSaleOrderDetailInput);
        },
        async deleteProductToSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.deleteProductToOrder)(context.user.companyId, args.saleOrderDetailId);
        },
        async addSerialToSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.addSerialToOrder)(context.user.companyId, args.addSerialToSaleOrderDetailInput);
        },
        async deleteSerialToSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.deleteSerialToOrder)(context.user.companyId, args.productSerialId);
        },
        async approveSaleOrder(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.approve)(context.user.companyId, args.saleOrderId);
        },
        async updateSaleOrderPaymentMethod(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.updateSaleOrderPaymentMethod)(context.user.companyId, args.saleOrderId, args.updateSaleOrderPaymentMethodInput?.payment_method, args.updateSaleOrderPaymentMethodInput?.contado_payment_method);
        },
        async updateSaleOrderDiscount(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.updateSaleOrderDiscount)(context.user.companyId, args.saleOrderId, args.updateSaleOrderDiscountInput?.discount_type, args.updateSaleOrderDiscountInput?.discount_value);
        },
        async addManySerialsToSaleOrderDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleOrder_service_1.addManySerialsToOrder)(context.user.companyId, args.addManySerialsToSaleOrderDetailInput);
        },
    },
};
