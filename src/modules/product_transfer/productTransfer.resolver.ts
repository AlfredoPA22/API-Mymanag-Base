import { hasPermission } from "../../utils/hasPermission";
import { create, createDetail } from "./productTransfer.service";

export const ProductTransferResolver = {
  Query: {
    // async listPurchaseOrder(
    //   _: any,
    //   args: Record<string, any>,
    //   context: any
    // ): Promise<IPurchaseOrder[]> {
    //   const roleName = context.user.role;
    //   const permission = ["LIST_AND_CREATE_PURCHASE"];
    //   await hasPermission(roleName, permission);
    //   return await findAll(context.user.id);
    // },
  },
  Mutation: {
    async createProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await create(context.user.id, args.productTransferInput);
    },

    async createProductTransferDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await createDetail(args.productTransferDetailInput);
    },
  },
};
