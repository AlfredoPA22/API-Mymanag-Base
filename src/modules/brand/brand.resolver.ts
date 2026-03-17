import { IBrand } from "../../interfaces/brand.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import { create, deleteBrand, findAll, update } from "./brand.service";

export const brandResolver = {
  Query: {
    async listBrand(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IBrand[]> {
      checkAnyAbility(context.ability, [
        ["list", "Brand"],
        ["list", "Product"],
        ["read", "ProductReport"],
      ]);
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createBrand(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Brand"],
        ["create", "Product"],
      ]);
      return await create(context.user.companyId, args.brandInput);
    },
    async deleteBrand(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Brand");
      return await deleteBrand(context.user.companyId, args.brandId);
    },
    async updateBrand(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Brand");
      return await update(
        context.user.companyId,
        args.brandId,
        args.updateBrandInput
      );
    },
  },
};
