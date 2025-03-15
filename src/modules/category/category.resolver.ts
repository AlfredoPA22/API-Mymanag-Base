import { create, deleteCategory, findAll, update } from "./category.service";
import { ICategory } from "../../interfaces/category.interface";

export const categoryResolver = {
  Query: {
    async listCategory(): Promise<ICategory[]> {
      return await findAll();
    },
  },
  Mutation: {
    async createCategory(_: any, args: Record<string, any>) {
      return await create(args.categoryInput);
    },
    async deleteCategory(_: any, args: Record<string, any>) {
      return await deleteCategory(args.categoryId);
    },
    async updateCategory(_: any, args: Record<string, any>) {
      return await update(args.categoryId, args.updateCategoryInput);
    },
  },
};
