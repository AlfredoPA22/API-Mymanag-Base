import { checkAbility, checkAnyAbility } from "../../utils/ability";
import {
  createSaleReturn,
  findAllSaleReturns,
  findSaleReturn,
  findSaleReturnBySaleOrder,
  findSaleReturnDetail,
} from "./saleReturn.service";

export const saleReturnResolver = {
  Query: {
    async listSaleReturn(_: any, _args: any, context: any) {
      checkAbility(context.ability, "list", "Sale");
      return await findAllSaleReturns(context.user.companyId);
    },
    async findSaleReturn(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "read", "Sale");
      return await findSaleReturn(context.user.companyId, args.saleReturnId);
    },
    async listSaleReturnDetail(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "read", "Sale");
      return await findSaleReturnDetail(context.user.companyId, args.saleReturnId);
    },
    async findSaleReturnBySaleOrder(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "read", "Sale");
      return await findSaleReturnBySaleOrder(context.user.companyId, args.saleOrderId);
    },
  },
  Mutation: {
    async createSaleReturn(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await createSaleReturn(
        context.user.companyId,
        context.user.id,
        args.saleOrderId,
        args.reason,
        args.items
      );
    },
  },
};
