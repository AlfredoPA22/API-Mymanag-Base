"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kardexResolver = void 0;
const ability_1 = require("../../utils/ability");
const kardex_service_1 = require("./kardex.service");
exports.kardexResolver = {
    Query: {
        async listKardexByProduct(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "listKardex", "Product");
            return await (0, kardex_service_1.listKardexByProduct)(context.user.companyId, args.productId);
        },
    },
    Mutation: {},
};
