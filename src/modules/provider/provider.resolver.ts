import { IProvider } from "../../interfaces/provider.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import { create, deleteProvider, findAll, update } from "./provider.service";

export const providerResolver = {
  Query: {
    async listProvider(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProvider[]> {
      checkAnyAbility(context.ability, [
        ["list", "Provider"],
        ["list", "Purchase"],
        ["read", "PurchaseReport"],
      ]);
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createProvider(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Provider"],
        ["create", "Purchase"],
      ]);
      return await create(context.user.companyId, args.providerInput);
    },
    async deleteProvider(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Provider");
      return await deleteProvider(context.user.companyId, args.providerId);
    },
    async updateProvider(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Provider");
      return await update(
        context.user.companyId,
        args.providerId,
        args.updateProviderInput
      );
    },
  },
};
