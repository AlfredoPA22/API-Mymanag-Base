"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionResolver = void 0;
const permission_service_1 = require("./permission.service");
exports.permissionResolver = {
    Mutation: {
        async createPermission(_, args) {
            return await (0, permission_service_1.create)(args.permissionInput);
        },
    },
    Query: {
        async listPermission() {
            return await (0, permission_service_1.findAll)();
        },
    },
};
