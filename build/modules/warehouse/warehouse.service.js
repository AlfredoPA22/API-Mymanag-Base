"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.deleteWarehouse = exports.create = exports.findAll = void 0;
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const warehouse_model_1 = require("./warehouse.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const findAll = async (companyId) => {
    return await warehouse_model_1.Warehouse.find({
        company: companyId,
    })
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const create = async (companyId, warehouseInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const warehouseCount = await warehouse_model_1.Warehouse.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "almacenes", warehouseCount, planLimits.maxWarehouse);
    const warehouse = await warehouse_model_1.Warehouse.findOne({
        company: companyId,
        name: warehouseInput.name,
    });
    if (warehouse) {
        throw new Error("El almacén ya existe");
    }
    const newWarehouse = await warehouse_model_1.Warehouse.create({
        ...warehouseInput,
        company: companyId,
    });
    return newWarehouse;
};
exports.create = create;
const deleteWarehouse = async (companyId, warehouseId) => {
    const warehouse = await warehouse_model_1.Warehouse.findOne({
        _id: warehouseId,
        company: companyId,
    });
    if (!warehouse) {
        throw new Error("El almacén no existe");
    }
    const findProductSerial = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        warehouse: warehouseId,
    });
    const findProductInventory = await product_inventory_model_1.ProductInventory.find({
        company: companyId,
        warehouse: warehouseId,
    });
    if (findProductSerial.length > 0 || findProductInventory.length > 0) {
        throw new Error("No se puede eliminar porque el almacén tiene productos");
    }
    const deleted = await warehouse_model_1.Warehouse.deleteOne({
        _id: warehouseId,
        company: companyId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteWarehouse = deleteWarehouse;
const update = async (companyId, warehouseId, updateWarehouseInput) => {
    const warehouse = await warehouse_model_1.Warehouse.findOne({
        _id: warehouseId,
        company: companyId,
    });
    if (!warehouse) {
        throw new Error("El almacén no existe");
    }
    const warehouseUpdated = await warehouse_model_1.Warehouse.findOneAndUpdate({ _id: warehouseId, company: companyId }, { $set: updateWarehouseInput }, { new: true });
    return warehouseUpdated;
};
exports.update = update;
