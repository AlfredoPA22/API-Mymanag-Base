import { ICommission } from "../../interfaces/commission.interface";
import { checkAbility } from "../../utils/ability";
import { findCommission, listCommissions, markCommissionPaid, revertCommissionPayment } from "./commission.service";

export const commissionResolver = {
  Query: {
    async listCommissions(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICommission[]> {
      checkAbility(context.ability, "list", "Commission");
      return await listCommissions(
        context.user.companyId,
        context.user.id,
        args.filter ?? {}
      );
    },
    async findCommission(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICommission> {
      checkAbility(context.ability, "read", "Commission");
      return await findCommission(context.user.companyId, context.user.id, args.commissionId);
    },
  },
  Mutation: {
    async markCommissionPaid(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICommission> {
      checkAbility(context.ability, "update", "Commission");
      return await markCommissionPaid(
        context.user.companyId,
        context.user.id,
        args.commissionId
      );
    },
    async revertCommissionPayment(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICommission> {
      checkAbility(context.ability, "update", "Commission");
      return await revertCommissionPayment(
        context.user.companyId,
        args.commissionId
      );
    },
  },
};
