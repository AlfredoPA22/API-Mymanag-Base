"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientResolver = void 0;
const client_service_1 = require("./client.service");
const ability_1 = require("../../utils/ability");
exports.clientResolver = {
    Query: {
        async listClient(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Client"],
                ["list", "Sale"],
                ["read", "SaleReport"],
            ]);
            return await (0, client_service_1.findAll)(context.user.companyId);
        },
        async listSaleOrderByClient(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "listSaleOrders", "Client");
            return await (0, client_service_1.findAllSaleOrderByClient)(context.user.companyId, context.user.id, args.clientId);
        },
    },
    Mutation: {
        async createClient(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Client"],
                ["create", "Sale"],
            ]);
            return await (0, client_service_1.create)(context.user.companyId, args.clientInput);
        },
        async deleteClient(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Client");
            return await (0, client_service_1.deleteClient)(context.user.companyId, args.clientId);
        },
        async updateClient(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Client");
            return await (0, client_service_1.update)(context.user.companyId, args.clientId, args.updateClientInput);
        },
    },
};
