"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.deleteUser = exports.update = exports.login = exports.switchUserState = exports.create = exports.findAll = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("./user.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const purchase_order_model_1 = require("../purchase_order/purchase_order.model");
const sale_payment_model_1 = require("../sale_payment/sale_payment.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const companyStatus_enum_1 = require("../../utils/enums/companyStatus.enum");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const findAll = async (companyId) => {
    return await user_model_1.User.find({
        company: companyId,
    })
        .populate("role")
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const create = async (companyId, userInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const userCount = await user_model_1.User.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "usuarios", userCount, planLimits.maxUser);
    const user = await user_model_1.User.findOne({
        company: companyId,
        user_name: userInput.user_name,
    });
    if (user) {
        throw new Error("El usuario ya existe");
    }
    const newUser = (await user_model_1.User.create({ ...userInput, company: companyId })).populate("role");
    return newUser;
};
exports.create = create;
const switchUserState = async (companyId, userId) => {
    const user = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!user) {
        throw new Error("Usuario no encontrado");
    }
    if (user.is_admin) {
        throw new Error("No se puede desactivar este usuario");
    }
    user.is_active = !user.is_active;
    const updatedUser = await user.save();
    return updatedUser;
};
exports.switchUserState = switchUserState;
const login = async (loginInput) => {
    const user = await user_model_1.User.findOne({
        user_name: loginInput.user_name,
    })
        .populate("role")
        .populate("company")
        .lean();
    if (!user) {
        throw new Error("Usuario no encontrado");
    }
    else if (!user.is_active) {
        throw new Error("Usuario inactivo");
    }
    const isMatch = await bcryptjs_1.default.compare(loginInput.password, user.password);
    if (!isMatch) {
        throw new Error("Credenciales invalidos");
    }
    if (user.company.status === companyStatus_enum_1.companyStatus.EXPIRED) {
        throw new Error("La suscripción de tu empresa venció. Contacta al administrador para renovarla.");
    }
    if (user.company.status === companyStatus_enum_1.companyStatus.SUSPENDED) {
        throw new Error("Tu empresa está suspendida. Contacta a soporte.");
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET no está definido en el entorno");
    }
    const token = jsonwebtoken_1.default.sign({
        id: user._id,
        username: user.user_name,
        role: user.role.name,
        company: user.company.name,
        companyLogo: user.company.image,
        companyId: user.company._id,
        currency: user.company.currency,
        permissions: user.role.permission,
        is_global: user.is_global ?? false,
        access: true,
    }, secret, {
        expiresIn: "1d",
    });
    const tokenWithBearer = `Bearer ${token}`;
    return tokenWithBearer;
};
exports.login = login;
const update = async (companyId, userId, updateUserInput) => {
    const user = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!user) {
        throw new Error("El usuario no existe");
    }
    if (user.is_admin &&
        updateUserInput.role &&
        updateUserInput.role.toString() !== user.role.toString()) {
        throw new Error("No se puede cambiar el rol de este usuario.");
    }
    if (updateUserInput.user_name &&
        updateUserInput.user_name !== user.user_name) {
        const exists = await user_model_1.User.findOne({
            username: updateUserInput.user_name,
            _id: { $ne: userId },
        });
        if (exists) {
            throw new Error("El nombre de usuario ya está en uso.");
        }
    }
    const userUpdated = await user_model_1.User.findOneAndUpdate({ _id: userId, company: companyId }, { $set: updateUserInput }, { new: true });
    return userUpdated;
};
exports.update = update;
const deleteUser = async (companyId, userId) => {
    const user = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!user) {
        throw new Error("El usuario no existe");
    }
    if (user.is_admin) {
        throw new Error("No se puede eliminar este usuario.");
    }
    const findPurchaseOrder = await purchase_order_model_1.PurchaseOrder.find({
        company: companyId,
        created_by: userId,
    });
    const findSaleOrder = await sale_order_model_1.SaleOrder.find({
        company: companyId,
        created_by: userId,
    });
    const findSalePayment = await sale_payment_model_1.SalePayment.find({
        company: companyId,
        created_by: userId,
    });
    if (findPurchaseOrder.length > 0 ||
        findSaleOrder.length > 0 ||
        findSalePayment.length > 0) {
        throw new Error("No se puede eliminar porque pertenece a una transaccion");
    }
    const deleted = await user_model_1.User.deleteOne({
        _id: userId,
        company: companyId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteUser = deleteUser;
const changePassword = async (companyId, userId, changePasswordInput) => {
    const user = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!user) {
        throw new Error("El usuario no existe");
    }
    const isMatch = await bcryptjs_1.default.compare(changePasswordInput.currentPassword, user.password);
    if (!isMatch) {
        throw new Error("La contraseña actual es incorrecta");
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(changePasswordInput.newPassword, salt);
    const userUpdated = await user_model_1.User.findOneAndUpdate({ _id: userId, company: companyId }, {
        $set: {
            password: hashedPassword,
        },
    }, { new: true });
    return userUpdated;
};
exports.changePassword = changePassword;
