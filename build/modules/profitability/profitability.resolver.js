"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profitabilityResolver = void 0;
const ability_1 = require("../../utils/ability");
const profitability_service_1 = require("./profitability.service");
exports.profitabilityResolver = {
    Query: {
        async profitabilityReport(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "ProfitabilityReport");
            return await (0, profitability_service_1.profitabilityReport)(context.user.companyId, context.user.id, args.filterInput ?? {});
        },
    },
    Mutation: {},
};
