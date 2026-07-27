"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.deleteProvider = exports.create = exports.findAll = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const purchase_order_model_1 = require("../purchase_order/purchase_order.model");
const provider_model_1 = require("./provider.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const findAll = async (companyId) => {
    return await provider_model_1.Provider.find({
        company: companyId,
    })
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const create = async (companyId, providerInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const providerCount = await provider_model_1.Provider.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "proveedores", providerCount, planLimits.maxProvider);
    const newProvider = await provider_model_1.Provider.create({
        company: companyId,
        code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.PROVIDER),
        ...providerInput,
    });
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.PROVIDER);
    return newProvider;
};
exports.create = create;
const deleteProvider = async (companyId, providerId) => {
    const provider = await provider_model_1.Provider.findOne({
        _id: providerId,
        company: companyId,
    });
    if (!provider) {
        throw new Error("El proveedor no existe");
    }
    const purchaseOrderProvider = await purchase_order_model_1.PurchaseOrder.find({
        company: companyId,
        provider: providerId,
    });
    if (purchaseOrderProvider.length > 0) {
        throw new Error("El proveedor ya pertenece a una compra");
    }
    const deleted = await provider_model_1.Provider.deleteOne({
        company: companyId,
        _id: providerId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteProvider = deleteProvider;
const update = async (companyId, providerId, updateProviderInput) => {
    const provider = await provider_model_1.Provider.findOne({
        _id: providerId,
        company: companyId,
    });
    if (!provider) {
        throw new Error("El proveedor no existe");
    }
    const providertUpdated = await provider_model_1.Provider.findOneAndUpdate({ _id: providerId, company: companyId }, { $set: updateProviderInput }, { new: true });
    return providertUpdated;
};
exports.update = update;
