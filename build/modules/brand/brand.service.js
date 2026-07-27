"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.deleteBrand = exports.subtractCount = exports.addCount = exports.create = exports.findById = exports.findAll = void 0;
const brand_model_1 = require("./brand.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const findAll = async (companyId) => {
    return await brand_model_1.Brand.find({
        company: companyId,
    })
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const findById = async (brandId) => {
    const brand = await brand_model_1.Brand.findById(brandId)
        .populate("company")
        .lean();
    if (!brand) {
        throw new Error("La marca no existe");
    }
    return brand;
};
exports.findById = findById;
const create = async (companyId, brandInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const brandCount = await brand_model_1.Brand.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "marcas", brandCount, planLimits.maxBrand);
    const brand = await brand_model_1.Brand.findOne({
        name: brandInput.name,
        company: companyId,
    });
    if (brand) {
        throw new Error("La marca ya existe");
    }
    const newBrand = await brand_model_1.Brand.create({ ...brandInput, company: companyId });
    return newBrand;
};
exports.create = create;
const addCount = async (brandId) => {
    const brand = await (0, exports.findById)(brandId);
    await brand_model_1.Brand.updateOne({ _id: brandId }, { count_product: brand.count_product + 1 });
};
exports.addCount = addCount;
const subtractCount = async (brandId) => {
    const brand = await (0, exports.findById)(brandId);
    await brand_model_1.Brand.updateOne({ _id: brandId }, { count_product: brand.count_product - 1 });
};
exports.subtractCount = subtractCount;
const deleteBrand = async (companyId, brandId) => {
    const brand = await brand_model_1.Brand.findOne({ _id: brandId, company: companyId });
    if (!brand) {
        throw new Error("La marca no existe");
    }
    if (brand.count_product > 0) {
        throw new Error("No se puede eliminar porque tiene productos asociados");
    }
    const deleted = await brand_model_1.Brand.deleteOne({ _id: brandId, company: companyId });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteBrand = deleteBrand;
const update = async (companyId, brandId, updateBrandInput) => {
    const brand = await brand_model_1.Brand.findOne({ _id: brandId, company: companyId });
    if (!brand) {
        throw new Error("La marca no existe");
    }
    const existingBrand = await brand_model_1.Brand.findOne({
        name: updateBrandInput.name,
        company: companyId,
        _id: { $ne: brandId },
    });
    if (existingBrand) {
        throw new Error("La marca ya existe");
    }
    const brandUpdated = await brand_model_1.Brand.findOneAndUpdate({ _id: brandId, company: companyId }, { $set: updateBrandInput }, { new: true });
    return brandUpdated;
};
exports.update = update;
