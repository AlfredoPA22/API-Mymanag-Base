"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryResolver = void 0;
const ability_1 = require("../../utils/ability");
const category_service_1 = require("./category.service");
exports.categoryResolver = {
    Query: {
        async listCategory(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Category"],
                ["list", "Product"],
                ["read", "ProductReport"],
            ]);
            return await (0, category_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async createCategory(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Category"],
                ["create", "Product"],
            ]);
            return await (0, category_service_1.create)(context.user.companyId, args.categoryInput);
        },
        async deleteCategory(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Category");
            return await (0, category_service_1.deleteCategory)(context.user.companyId, args.categoryId);
        },
        async updateCategory(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Category");
            return await (0, category_service_1.update)(context.user.companyId, args.categoryId, args.updateCategoryInput);
        },
    },
};
