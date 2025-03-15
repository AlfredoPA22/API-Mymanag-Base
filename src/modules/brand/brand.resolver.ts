import { create, deleteBrand, findAll, update } from "./brand.service";
import { IBrand } from "../../interfaces/brand.interface";

export const brandResolver = {
  Query: {
    async listBrand(): Promise<IBrand[]> {
      return await findAll();
    },
  },
  Mutation: {
    async createBrand(_: any, args: Record<string, any>) {
      return await create(args.brandInput);
    },
    async deleteBrand(_: any, args: Record<string, any>) {
      return await deleteBrand(args.brandId);
    },
    async updateBrand(_: any, args: Record<string, any>) {
      return await update(args.brandId, args.updateBrandInput);
    },
  },
};
