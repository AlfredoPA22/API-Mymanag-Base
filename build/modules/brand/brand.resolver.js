"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandResolver = void 0;
const ability_1 = require("../../utils/ability");
const brand_service_1 = require("./brand.service");
exports.brandResolver = {
    Query: {
        async listBrand(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Brand"],
                ["list", "Product"],
                ["read", "ProductReport"],
            ]);
            return await (0, brand_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async createBrand(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Brand"],
                ["create", "Product"],
            ]);
            return await (0, brand_service_1.create)(context.user.companyId, args.brandInput);
        },
        async deleteBrand(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Brand");
            return await (0, brand_service_1.deleteBrand)(context.user.companyId, args.brandId);
        },
        async updateBrand(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Brand");
            return await (0, brand_service_1.update)(context.user.companyId, args.brandId, args.updateBrandInput);
        },
    },
};
