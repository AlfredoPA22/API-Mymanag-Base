import {
  CategoryInput,
  ICategory,
  UpdateCategoryInput,
} from "../../interfaces/category.interface";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { Category } from "./category.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICategory[]> => {
  return await Category.find({ company: companyId })
    .populate("company")
    .lean<ICategory[]>();
};

export const findById = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICategory> => {
  const category = await Category.findOne({
    _id: categoryId,
  })
    .populate("company")
    .lean<ICategory>();

  if (!category) {
    throw new Error("La categoría no existe");
  }

  return category;
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  categoryInput: CategoryInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const categoryCount = await Category.countDocuments({ company: companyId });

  const planLimits = companyPlanLimits[company.plan as companyPlan];

  if (planLimits.maxCategory && categoryCount >= planLimits.maxCategory) {
    throw new Error(
      `Tu plan actual (${company.plan}) solo permite hasta ${planLimits.maxCategory} categorias`
    );
  }

  const category = await Category.findOne({
    name: categoryInput.name,
    company: companyId,
  });

  if (category) {
    throw new Error("La categoría ya existe");
  }

  const newCategory = await Category.create({
    ...categoryInput,
    company: companyId,
  });

  return newCategory;
};

export const addCount = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const category = await findById(categoryId);
  await Category.updateOne(
    { _id: categoryId },
    { count_product: category.count_product + 1 }
  );
};

export const subtractCount = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const category = await findById(categoryId);
  await Category.updateOne(
    { _id: categoryId },
    { count_product: category.count_product - 1 }
  );
};

export const deleteCategory = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const category = await Category.findOne({
    _id: categoryId,
    company: companyId,
  });

  if (!category) {
    throw new Error("La categoría no existe");
  }

  if (category.count_product > 0) {
    throw new Error("No se puede eliminar porque tiene productos asociados");
  }

  const deleted = await Category.deleteOne({
    _id: categoryId,
    company: companyId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateCategoryInput: UpdateCategoryInput
) => {
  const category = await Category.findOne({
    _id: categoryId,
    company: companyId,
  });

  if (!category) {
    throw new Error("La categoría no existe");
  }

  const existingCategory = await Category.findOne({
    name: updateCategoryInput.name,
    company: companyId,
    _id: { $ne: categoryId },
  });

  if (existingCategory) {
    throw new Error("La categoría ya existe");
  }

  const categoryUpdated = await Category.findOneAndUpdate(
    { _id: categoryId, company: companyId },
    { $set: updateCategoryInput },
    { new: true }
  );

  return categoryUpdated;
};
