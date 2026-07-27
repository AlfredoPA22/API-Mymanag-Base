"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseResolver = void 0;
const ability_1 = require("../../utils/ability");
const warehouse_service_1 = require("./warehouse.service");
exports.warehouseResolver = {
    Query: {
        async listWarehouse(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Warehouse"],
                ["list", "Purchase"],
                ["list", "Sale"],
            ]);
            return await (0, warehouse_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async createWarehouse(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Warehouse"],
                ["create", "Purchase"],
                ["create", "Sale"],
            ]);
            return await (0, warehouse_service_1.create)(context.user.companyId, args.warehouseInput);
        },
        async deleteWarehouse(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Warehouse");
            return await (0, warehouse_service_1.deleteWarehouse)(context.user.companyId, args.warehouseId);
        },
        async updateWarehouse(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Warehouse");
            return await (0, warehouse_service_1.update)(context.user.companyId, args.warehouseId, args.updateWarehouseInput);
        },
    },
};
