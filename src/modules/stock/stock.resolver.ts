import { auditStock, reconcileStock } from "./stock.service";

export const stockResolver = {
  Query: {
    async auditStock(_: any, _args: any, context: any) {
      return await auditStock(context.user.id);
    },
  },
  Mutation: {
    async reconcileStock(_: any, _args: any, context: any) {
      return await reconcileStock(context.user.id);
    },
  },
};
