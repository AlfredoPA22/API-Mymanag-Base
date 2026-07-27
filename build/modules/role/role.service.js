"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRolePermissions = exports.create = exports.listPermissionsByRole = exports.findAll = void 0;
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const company_model_1 = require("../company/company.model");
const user_model_1 = require("../user/user.model");
const role_model_1 = require("./role.model");
const findAll = async (companyId) => {
    return await role_model_1.Role.find({
        company: companyId,
    })
        .populate("permission")
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const listPermissionsByRole = async (companyId, roleId) => {
    const role = await role_model_1.Role.findOne({
        _id: roleId,
        company: companyId,
    }).lean();
    return role?.permission || [];
};
exports.listPermissionsByRole = listPermissionsByRole;
const create = async (companyId, roleInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const roleCount = await role_model_1.Role.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "roles", roleCount, planLimits.maxRole);
    const role = await role_model_1.Role.findOne({
        company: companyId,
        name: roleInput.name,
    });
    if (role) {
        throw new Error("El rol ya existe");
    }
    const newRole = await role_model_1.Role.create({ ...roleInput, company: companyId });
    return newRole;
};
exports.create = create;
const updateRolePermissions = async (companyId, roleId, permissions) => {
    const role = await role_model_1.Role.findOne({ _id: roleId, company: companyId });
    if (!role) {
        throw new Error("Rol no encontrado");
    }
    const updated = await role_model_1.Role.findByIdAndUpdate(roleId, { $set: { permission: permissions } }, { new: true }).lean();
    return updated;
};
exports.updateRolePermissions = updateRolePermissions;
const deleteRole = async (companyId, roleId) => {
    const findUser = await user_model_1.User.find({
        company: companyId,
        role: roleId,
    });
    if (findUser.length > 0) {
        throw new Error("No se puede eliminar porque pertenece a un usuario");
    }
    const deleted = await role_model_1.Role.deleteOne({
        _id: roleId,
        company: companyId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteRole = deleteRole;
