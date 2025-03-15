import { IProvider } from "../../interfaces/provider.interface";
import { create, deleteProvider, findAll, update } from "./provider.service";

export const providerResolver = {
  Query: {
    async listProvider(): Promise<IProvider[]> {
      return await findAll();
    },
    //   async listSaleOrderByClient(
    //     _: any,
    //     args: Record<string, any>
    //   ): Promise<ISaleOrderByClient> {
    //     return await findAllSaleOrderByClient(args.clientId);
    //   },
  },
  Mutation: {
    async createProvider(_: any, args: Record<string, any>) {
      return await create(args.providerInput);
    },
    async deleteProvider(_: any, args: Record<string, any>) {
      return await deleteProvider(args.providerId);
    },
    async updateProvider(_: any, args: Record<string, any>) {
      return await update(args.providerId, args.updateProviderInput);
    },
  },
};
