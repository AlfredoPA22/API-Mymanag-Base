"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = exports.deleteCategory = exports.subtractCount = exports.addCount = exports.create = exports.findById = exports.findAll = void 0;
const category_model_1 = require("./category.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const findAll = async (companyId) => {
    return await category_model_1.Category.find({ company: companyId })
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const findById = async (categoryId) => {
    const category = await category_model_1.Category.findOne({
        _id: categoryId,
    })
        .populate("company")
        .lean();
    if (!category) {
        throw new Error("La categoría no existe");
    }
    return category;
};
exports.findById = findById;
const create = async (companyId, categoryInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const categoryCount = await category_model_1.Category.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "categorías", categoryCount, planLimits.maxCategory);
    const category = await category_model_1.Category.findOne({
        name: categoryInput.name,
        company: companyId,
    });
    if (category) {
        throw new Error("La categoría ya existe");
    }
    const newCategory = await category_model_1.Category.create({
        ...categoryInput,
        company: companyId,
    });
    return newCategory;
};
exports.create = create;
const addCount = async (categoryId) => {
    const category = await (0, exports.findById)(categoryId);
    await category_model_1.Category.updateOne({ _id: categoryId }, { count_product: category.count_product + 1 });
};
exports.addCount = addCount;
const subtractCount = async (categoryId) => {
    const category = await (0, exports.findById)(categoryId);
    await category_model_1.Category.updateOne({ _id: categoryId }, { count_product: category.count_product - 1 });
};
exports.subtractCount = subtractCount;
const deleteCategory = async (companyId, categoryId) => {
    const category = await category_model_1.Category.findOne({
        _id: categoryId,
        company: companyId,
    });
    if (!category) {
        throw new Error("La categoría no existe");
    }
    if (category.count_product > 0) {
        throw new Error("No se puede eliminar porque tiene productos asociados");
    }
    const deleted = await category_model_1.Category.deleteOne({
        _id: categoryId,
        company: companyId,
    });
    return {
        success: deleted.deletedCount > 0,
    };
};
exports.deleteCategory = deleteCategory;
const update = async (companyId, categoryId, updateCategoryInput) => {
    const category = await category_model_1.Category.findOne({
        _id: categoryId,
        company: companyId,
    });
    if (!category) {
        throw new Error("La categoría no existe");
    }
    const existingCategory = await category_model_1.Category.findOne({
        name: updateCategoryInput.name,
        company: companyId,
        _id: { $ne: categoryId },
    });
    if (existingCategory) {
        throw new Error("La categoría ya existe");
    }
    const categoryUpdated = await category_model_1.Category.findOneAndUpdate({ _id: categoryId, company: companyId }, { $set: updateCategoryInput }, { new: true });
    return categoryUpdated;
};
exports.update = update;
