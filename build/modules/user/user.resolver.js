"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResolver = void 0;
const ability_1 = require("../../utils/ability");
const user_service_1 = require("./user.service");
exports.userResolver = {
    Query: {
        async listUser(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async createUser(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.create)(context.user.companyId, args.userInput);
        },
        async login(_, args) {
            return await (0, user_service_1.login)(args.loginInput);
        },
        async switchUserState(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.switchUserState)(context.user.companyId, args.userId);
        },
        async updateUser(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.update)(context.user.companyId, args.userId, args.updateUserInput);
        },
        async changePassword(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.changePassword)(context.user.companyId, args.userId, args.changePasswordInput);
        },
        async deleteUser(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "manage", "User");
            return await (0, user_service_1.deleteUser)(context.user.companyId, args.userId);
        },
    },
};
