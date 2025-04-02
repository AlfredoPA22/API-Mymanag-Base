import { IProvider } from "../../interfaces/provider.interface";
import { hasPermission } from "../../utils/hasPermission";
import { create, deleteProvider, findAll, update } from "./provider.service";

export const providerResolver = {
  Query: {
    async listProvider(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProvider[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_PROVIDER",
        "LIST_AND_CREATE_PURCHASE",
      ];
      await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createProvider(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PROVIDER"];
      await hasPermission(roleName, permission);

      return await create(args.providerInput);
    },
    async deleteProvider(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PROVIDER"];
      await hasPermission(roleName, permission);

      return await deleteProvider(args.providerId);
    },
    async updateProvider(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_PROVIDER"];
      await hasPermission(roleName, permission);

      return await update(args.providerId, args.updateProviderInput);
    },
  },
};
