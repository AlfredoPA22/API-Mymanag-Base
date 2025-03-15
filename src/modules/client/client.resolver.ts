import {
  create,
  deleteClient,
  findAll,
  findAllSaleOrderByClient,
  update,
} from "./client.service";
import { IClient } from "../../interfaces/client.interface";
import { ISaleOrderByClient } from "../../interfaces/saleOrder.interface";

export const clientResolver = {
  Query: {
    async listClient(): Promise<IClient[]> {
      return await findAll();
    },
    async listSaleOrderByClient(
      _: any,
      args: Record<string, any>
    ): Promise<ISaleOrderByClient> {
      return await findAllSaleOrderByClient(args.clientId);
    },
  },
  Mutation: {
    async createClient(_: any, args: Record<string, any>) {
      return await create(args.clientInput);
    },
    async deleteClient(_: any, args: Record<string, any>) {
      return await deleteClient(args.clientId);
    },
    async updateClient(_: any, args: Record<string, any>) {
      return await update(args.clientId, args.updateClientInput);
    },
  },
};
