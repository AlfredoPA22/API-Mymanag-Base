"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salePaymentResolver = void 0;
const ability_1 = require("../../utils/ability");
const salePayment_service_1 = require("./salePayment.service");
exports.salePaymentResolver = {
    Query: {
        async listSalePayment(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Payment");
            return await (0, salePayment_service_1.findAll)(context.user.companyId, context.user.id);
        },
        async listSalePaymentBySaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Payment");
            return await (0, salePayment_service_1.listSalePaymentBySaleOrder)(context.user.companyId, context.user.id, args.saleOrderId);
        },
        async detailSalePaymentBySaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Payment");
            return await (0, salePayment_service_1.detailSalePaymentBySaleOrder)(context.user.companyId, args.saleOrderId);
        },
    },
    Mutation: {
        async createSalePayment(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Payment");
            return await (0, salePayment_service_1.createPayment)(context.user.companyId, context.user.id, args.salePaymentInput);
        },
        async deleteSalePayment(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Payment");
            return await (0, salePayment_service_1.deleteSalePayment)(context.user.companyId, args.salePaymentId);
        },
    },
};
