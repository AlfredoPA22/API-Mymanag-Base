"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleResolver = void 0;
const ability_1 = require("../../utils/ability");
const role_service_1 = require("./role.service");
exports.roleResolver = {
    Query: {
        async listRole(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "Role");
            return await (0, role_service_1.findAll)(context.user.companyId);
        },
        async listPermissionsByRole(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "Role");
            return await (0, role_service_1.listPermissionsByRole)(context.user.companyId, args.roleId);
        },
    },
    Mutation: {
        async createRole(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "Role");
            return await (0, role_service_1.create)(context.user.companyId, args.roleInput);
        },
        async updateRolePermissions(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "Role");
            return await (0, role_service_1.updateRolePermissions)(context.user.companyId, args.roleId, args.permissions);
        },
        async deleteRole(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "Role");
            return await (0, role_service_1.deleteRole)(context.user.companyId, args.roleId);
        },
    },
};
