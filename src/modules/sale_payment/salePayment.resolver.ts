import {
  IDetailSalePaymentBySaleOrder,
  ISalePayment,
} from "../../interfaces/salePayment.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
  createPayment,
  deleteSalePayment,
  detailSalePaymentBySaleOrder,
  findAll,
  listSalePaymentBySaleOrder,
} from "./salePayment.service";

export const salePaymentResolver = {
  Query: {
    async listSalePayment(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalePayment[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PAYMENT"];
      await hasPermission(roleName, permission);

      return await findAll(context.user.id);
    },

    async listSalePaymentBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalePayment[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PAYMENT"];
      await hasPermission(roleName, permission);

      return await listSalePaymentBySaleOrder(
        context.user.id,
        args.saleOrderId
      );
    },

    async detailSalePaymentBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IDetailSalePaymentBySaleOrder> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PAYMENT"];
      await hasPermission(roleName, permission);

      return await detailSalePaymentBySaleOrder(args.saleOrderId);
    },
  },
  Mutation: {
    async createSalePayment(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PAYMENT"];
      await hasPermission(roleName, permission);

      return await createPayment(context.user.id, args.salePaymentInput);
    },

    async deleteSalePayment(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PAYMENT"];
      await hasPermission(roleName, permission);

      return await deleteSalePayment(args.salePaymentId);
    },
  },
};
