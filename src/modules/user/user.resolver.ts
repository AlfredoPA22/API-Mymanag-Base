import { IUser } from "../../interfaces/user.interface";
import { checkAbility } from "../../utils/ability";
import {
  changePassword,
  create,
  deleteUser,
  findAll,
  login,
  switchUserState,
  update,
} from "./user.service";

export const userResolver = {
  Query: {
    async listUser(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IUser[]> {
      checkAbility(context.ability, "manage", "User");
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createUser(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "User");
      return await create(context.user.companyId, args.userInput);
    },
    async login(_: any, args: Record<string, any>) {
      return await login(args.loginInput);
    },
    async switchUserState(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "User");
      return await switchUserState(context.user.companyId, args.userId);
    },
    async updateUser(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "User");
      return await update(
        context.user.companyId,
        args.userId,
        args.updateUserInput
      );
    },
    async changePassword(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "User");
      return await changePassword(
        context.user.companyId,
        args.userId,
        args.changePasswordInput
      );
    },
    async deleteUser(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "User");
      return await deleteUser(context.user.companyId, args.userId);
    },
  },
};
