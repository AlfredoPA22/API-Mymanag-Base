import { IProfitabilityReport } from "../../interfaces/profitability.interface";
import { checkAbility } from "../../utils/ability";
import { profitabilityReport } from "./profitability.service";

export const profitabilityResolver = {
  Query: {
    async profitabilityReport(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProfitabilityReport> {
      checkAbility(context.ability, "read", "ProfitabilityReport");
      return await profitabilityReport(
        context.user.companyId,
        context.user.id,
        args.filterInput ?? {}
      );
    },
  },
  Mutation: {},
};
