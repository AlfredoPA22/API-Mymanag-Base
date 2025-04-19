import { create, deleteBrand, findAll, update } from "./brand.service";
import { IBrand } from "../../interfaces/brand.interface";
import { hasPermission } from "../../utils/hasPermission";

export const brandResolver = {
  Query: {
    async listBrand(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IBrand[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_BRAND", "LIST_AND_CREATE_PRODUCT","PRODUCT_REPORT"];
      await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createBrand(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_BRAND", "LIST_AND_CREATE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await create(args.brandInput);
    },
    async deleteBrand(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_BRAND"];
      await hasPermission(roleName, permission);

      return await deleteBrand(args.brandId);
    },
    async updateBrand(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_BRAND"];
      await hasPermission(roleName, permission);

      return await update(args.brandId, args.updateBrandInput);
    },
  },
};
