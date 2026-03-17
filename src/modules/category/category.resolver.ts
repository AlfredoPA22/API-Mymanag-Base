import { ICategory } from "../../interfaces/category.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import { create, deleteCategory, findAll, update } from "./category.service";

export const categoryResolver = {
  Query: {
    async listCategory(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICategory[]> {
      checkAnyAbility(context.ability, [
        ["list", "Category"],
        ["list", "Product"],
        ["read", "ProductReport"],
      ]);
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createCategory(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Category"],
        ["create", "Product"],
      ]);
      return await create(context.user.companyId, args.categoryInput);
    },
    async deleteCategory(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Category");
      return await deleteCategory(context.user.companyId, args.categoryId);
    },
    async updateCategory(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Category");
      return await update(
        context.user.companyId,
        args.categoryId,
        args.updateCategoryInput
      );
    },
  },
};
