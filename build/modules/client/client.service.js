"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.deleteClient = exports.create = exports.findAllSaleOrderByClient = exports.findAll = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const client_model_1 = require("./client.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const user_model_1 = require("../user/user.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const money_1 = require("../../utils/money");
const findAll = async (companyId) => {
    return await client_model_1.Client.find({ company: companyId })
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const findAllSaleOrderByClient = async (companyId, userId, clientId) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client) {
        throw new Error("El cliente no existe");
    }
    const filter = {
        client: clientId,
        company: companyId,
    };
    if (!foundUser.is_global) {
        filter.created_by = userId;
    }
    const allSalesOrderByClient = await sale_order_model_1.SaleOrder.find(filter)
        .populate("client")
        .populate("company")
        .lean();
    const total = (0, money_1.round2)(allSalesOrderByClient
        .filter((saleOrder) => saleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.APROBADO)
        .reduce((sum, saleOrder) => sum + Number(saleOrder.total || 0), 0));
    const response = {
        saleOrder: allSalesOrderByClient,
        total: total.toString(),
    };
    return response;
};
exports.findAllSaleOrderByClient = findAllSaleOrderByClient;
const create = async (companyId, clientInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const clientCount = await client_model_1.Client.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "clientes", clientCount, planLimits.maxClient);
    const newClient = await client_model_1.Client.create({
        code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.CLIENT),
        ...clientInput,
        company: companyId,
    });
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.CLIENT);
    return newClient;
};
exports.create = create;
const deleteClient = async (companyId, clientId) => {
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client) {
        throw new Error("El cliente no existe");
    }
    const saleOrderClient = await sale_order_model_1.SaleOrder.find({
        client: clientId,
        company: companyId,
    });
    if (saleOrderClient.length > 0) {
        throw new Error("El cliente ya pertenece a una venta");
    }
    const deleted = await client_model_1.Client.deleteOne({
        _id: clientId,
        company: companyId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteClient = deleteClient;
const update = async (companyId, clientId, updateClientInput) => {
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client) {
        throw new Error("El cliente no existe");
    }
    const clientUpdated = await client_model_1.Client.findOneAndUpdate({ _id: clientId, company: companyId }, { $set: updateClientInput }, { new: true });
    return clientUpdated;
};
exports.update = update;
