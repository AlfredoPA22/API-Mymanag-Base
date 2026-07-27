"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerResolver = void 0;
const ability_1 = require("../../utils/ability");
const provider_service_1 = require("./provider.service");
exports.providerResolver = {
    Query: {
        async listProvider(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Provider"],
                ["list", "Purchase"],
                ["read", "PurchaseReport"],
            ]);
            return await (0, provider_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async createProvider(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Provider"],
                ["create", "Purchase"],
            ]);
            return await (0, provider_service_1.create)(context.user.companyId, args.providerInput);
        },
        async deleteProvider(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Provider");
            return await (0, provider_service_1.deleteProvider)(context.user.companyId, args.providerId);
        },
        async updateProvider(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Provider");
            return await (0, provider_service_1.update)(context.user.companyId, args.providerId, args.updateProviderInput);
        },
    },
};
