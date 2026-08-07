import { ICashRegister } from "../../interfaces/cashRegister.interface";
import { checkAbility } from "../../utils/ability";
import {
  addCashMovement,
  closeCashRegister,
  findAll,
  findCurrentCashRegister,
  openCashRegister,
} from "./cashRegister.service";

export const cashRegisterResolver = {
  Query: {
    async findCurrentCashRegister(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICashRegister | null> {
      checkAbility(context.ability, "read", "CashRegister");
      return await findCurrentCashRegister(context.user.companyId);
    },
    async listCashRegister(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICashRegister[]> {
      checkAbility(context.ability, "list", "CashRegister");
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async openCashRegister(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "CashRegister");
      return await openCashRegister(
        context.user.companyId,
        context.user.id,
        args.openCashRegisterInput
      );
    },
    async closeCashRegister(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "CashRegister");
      return await closeCashRegister(
        context.user.companyId,
        context.user.id,
        args.cashRegisterId,
        args.closeCashRegisterInput
      );
    },
    async addCashMovement(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "CashRegister");
      return await addCashMovement(
        context.user.companyId,
        context.user.id,
        args.cashRegisterId,
        args.addCashMovementInput
      );
    },
  },
};
