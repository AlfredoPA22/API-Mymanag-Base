import {
  IDetailSalePaymentBySaleOrder,
  ISalePayment,
} from "../../interfaces/salePayment.interface";
import { checkAbility } from "../../utils/ability";
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
      checkAbility(context.ability, "list", "Payment");
      return await findAll(context.user.companyId, context.user.id);
    },
    async listSalePaymentBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalePayment[]> {
      checkAbility(context.ability, "list", "Payment");
      return await listSalePaymentBySaleOrder(
        context.user.companyId,
        context.user.id,
        args.saleOrderId
      );
    },
    async detailSalePaymentBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IDetailSalePaymentBySaleOrder> {
      checkAbility(context.ability, "list", "Payment");
      return await detailSalePaymentBySaleOrder(
        context.user.companyId,
        args.saleOrderId
      );
    },
  },
  Mutation: {
    async createSalePayment(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "Payment");
      return await createPayment(
        context.user.companyId,
        context.user.id,
        args.salePaymentInput
      );
    },
    async deleteSalePayment(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Payment");
      return await deleteSalePayment(
        context.user.companyId,
        args.salePaymentId
      );
    },
  },
};
