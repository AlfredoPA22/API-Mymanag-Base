import { IProduct } from "../../interfaces/product.interface";
import { IStoreOrderResult } from "../../interfaces/store.interface";
import { createStoreOrder, listStoreProducts } from "./store.service";

export const storeResolver = {
  Query: {
    async storeListProducts(
      _: any,
      args: Record<string, any>
    ): Promise<IProduct[]> {
      return await listStoreProducts(args.companyId);
    },
  },
  Mutation: {
    async storeCreateOrder(
      _: any,
      args: Record<string, any>
    ): Promise<IStoreOrderResult> {
      return await createStoreOrder(args.companyId, args.storeOrderInput);
    },
  },
};
