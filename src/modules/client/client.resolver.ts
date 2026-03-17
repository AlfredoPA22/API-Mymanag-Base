import {
  create,
  deleteClient,
  findAll,
  findAllSaleOrderByClient,
  update,
} from "./client.service";
import { IClient } from "../../interfaces/client.interface";
import { ISaleOrderByClient } from "../../interfaces/saleOrder.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";

export const clientResolver = {
  Query: {
    async listClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IClient[]> {
      checkAnyAbility(context.ability, [
        ["list", "Client"],
        ["list", "Sale"],
        ["read", "SaleReport"],
      ]);
      return await findAll(context.user.companyId);
    },
    async listSaleOrderByClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByClient> {
      checkAbility(context.ability, "listSaleOrders", "Client");
      return await findAllSaleOrderByClient(
        context.user.companyId,
        context.user.id,
        args.clientId
      );
    },
  },
  Mutation: {
    async createClient(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Client"],
        ["create", "Sale"],
      ]);
      return await create(context.user.companyId, args.clientInput);
    },
    async deleteClient(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Client");
      return await deleteClient(context.user.companyId, args.clientId);
    },
    async updateClient(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Client");
      return await update(
        context.user.companyId,
        args.clientId,
        args.updateClientInput
      );
    },
  },
};
