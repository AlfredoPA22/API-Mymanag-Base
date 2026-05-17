import { IKardexEntry } from "../../interfaces/kardex.interface";
import { checkAbility } from "../../utils/ability";
import { listKardexByProduct } from "./kardex.service";

export const kardexResolver = {
  Query: {
    async listKardexByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IKardexEntry[]> {
      checkAbility(context.ability, "listKardex", "Product");
      return await listKardexByProduct(
        context.user.companyId,
        args.productId
      );
    },
  },
  Mutation: {},
};
