"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = exports.create = void 0;
const permission_model_1 = require("./permission.model");
const permissions_1 = require("./utils/permissions");
const create = async (permissionInput) => {
    const permission = await permission_model_1.Permission.findOne({
        name: permissionInput.name,
    });
    if (permission) {
        throw new Error("El permiso ya existe");
    }
    const newPermission = await permission_model_1.Permission.create(permissionInput);
    return newPermission;
};
exports.create = create;
const findAll = async () => {
    return permissions_1.PERMISSIONS_TREE;
};
exports.findAll = findAll;
