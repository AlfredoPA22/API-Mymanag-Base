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
        "PRODUCT_REPORT",
      ];
      await hasPermission(roleName, permission);

      return await findAll(context.user.companyId);
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
      return await create(context.user.companyId, args.categoryInput);
    },
    async deleteCategory(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_CATEGORY"];
      await hasPermission(roleName, permission);
      return await deleteCategory(context.user.companyId, args.categoryId);
    },
    async updateCategory(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_CATEGORY"];
      await hasPermission(roleName, permission);
      return await update(
        context.user.companyId,
        args.categoryId,
        args.updateCategoryInput
      );
    },
  },
};
