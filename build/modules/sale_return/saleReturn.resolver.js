"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saleReturnResolver = void 0;
const ability_1 = require("../../utils/ability");
const saleReturn_service_1 = require("./saleReturn.service");
exports.saleReturnResolver = {
    Query: {
        async listSaleReturn(_, _args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Sale");
            return await (0, saleReturn_service_1.findAllSaleReturns)(context.user.companyId);
        },
        async findSaleReturn(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "Sale");
            return await (0, saleReturn_service_1.findSaleReturn)(context.user.companyId, args.saleReturnId);
        },
        async listSaleReturnDetail(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "Sale");
            return await (0, saleReturn_service_1.findSaleReturnDetail)(context.user.companyId, args.saleReturnId);
        },
        async findSaleReturnBySaleOrder(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "Sale");
            return await (0, saleReturn_service_1.findSaleReturnBySaleOrder)(context.user.companyId, args.saleOrderId);
        },
    },
    Mutation: {
        async createSaleReturn(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Sale"],
                ["update", "Sale"],
            ]);
            return await (0, saleReturn_service_1.createSaleReturn)(context.user.companyId, context.user.id, args.saleOrderId, args.reason, args.items);
        },
    },
};
