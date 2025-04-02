import {
  create,
  deleteClient,
  findAll,
  findAllSaleOrderByClient,
  update,
} from "./client.service";
import { IClient } from "../../interfaces/client.interface";
import { ISaleOrderByClient } from "../../interfaces/saleOrder.interface";
import { hasPermission } from "../../utils/hasPermission";

export const clientResolver = {
  Query: {
    async listClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IClient[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_CLIENT", "LIST_AND_CREATE_SALE"];
      await hasPermission(roleName, permission);

      return await findAll();
    },
    async listSaleOrderByClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByClient> {
      const roleName = context.user.role;
      const permission = ["LIST_SALE_ORDER_BY_CLIENT"];
      await hasPermission(roleName, permission);

      return await findAllSaleOrderByClient(args.clientId);
    },
  },
  Mutation: {
    async createClient(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_CLIENT"];
      await hasPermission(roleName, permission);

      return await create(args.clientInput);
    },
    async deleteClient(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_CLIENT"];
      await hasPermission(roleName, permission);

      return await deleteClient(args.clientId);
    },
    async updateClient(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_CLIENT"];
      await hasPermission(roleName, permission);

      return await update(args.clientId, args.updateClientInput);
    },
  },
};
