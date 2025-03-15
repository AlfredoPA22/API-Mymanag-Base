import {
  CategoryInput,
  ICategory,
  UpdateCategoryInput,
} from "../../interfaces/category.interface";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { Category } from "./category.model";

export const findAll = async (): Promise<ICategory[]> => {
  return await Category.find();
};

export const findById = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ICategory> => {
  const category = await Category.findById(categoryId);
  if (category) {
    return category.toObject() as ICategory;
  } else {
    throw new Error("La categoria no existe");
  }
};

export const create = async (categoryInput: CategoryInput) => {
  const category = await Category.findOne({
    name: categoryInput.name,
  });

  if (category) {
    throw new Error("La categoria ya existe");
  }
  const newCategory = await Category.create(categoryInput);

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

export const deleteCategory = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const category = await findById(categoryId);

  if (category.count_product > 0) {
    throw new Error("No se puede eliminar porque tiene productos asociados");
  }

  const deleted = await Category.deleteOne({
    _id: categoryId,
  });

  if (deleted.deletedCount > 0) {
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};

export const update = async (
  categoryId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateCategoryInput: UpdateCategoryInput
) => {
  const categoryUpdated = await Category.findByIdAndUpdate(
    categoryId,
    { $set: updateCategoryInput },
    { new: true }
  );

  if (!categoryUpdated) {
    throw new Error("La categoria no existe");
  }

  return categoryUpdated;
};
