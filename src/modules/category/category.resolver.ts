import { ICategory } from "../../interfaces/category.interface";
import { hasPermission } from "../../utils/hasPermission";
import { create, deleteCategory, findAll, update } from "./category.service";

export const categoryResolver = {
  Query: {
    async listCategory(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICategory[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_CATEGORY",
        "LIST_AND_CREATE_PRODUCT",
      ];
      await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createCategory(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_CATEGORY",
        "LIST_AND_CREATE_PRODUCT",
      ];
      await hasPermission(roleName, permission);
      return await create(args.categoryInput);
    },
    async deleteCategory(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_CATEGORY"];
      await hasPermission(roleName, permission);
      return await deleteCategory(args.categoryId);
    },
    async updateCategory(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_CATEGORY"];
      await hasPermission(roleName, permission);
      return await update(args.categoryId, args.updateCategoryInput);
    },
  },
};
