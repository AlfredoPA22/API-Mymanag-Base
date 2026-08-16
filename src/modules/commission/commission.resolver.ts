import { ICommission } from "../../interfaces/commission.interface";
import { checkAbility } from "../../utils/ability";
import { listCommissions, markCommissionPaid } from "./commission.service";

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
  },
};
