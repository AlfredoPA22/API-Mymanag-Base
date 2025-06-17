import { IUser } from "../../interfaces/user.interface";
import { hasPermission } from "../../utils/hasPermission";
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
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createUser(_: any, args: Record<string, any>, context: any) {
      return await create(context.user.companyId, args.userInput);
    },
    async login(_: any, args: Record<string, any>) {
      return await login(args.loginInput);
    },
    async switchUserState(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await switchUserState(context.user.companyId, args.userId);
    },
    async updateUser(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await update(
        context.user.companyId,
        args.userId,
        args.updateUserInput
      );
    },
    async changePassword(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await changePassword(
        context.user.companyId,
        args.userId,
        args.changePasswordInput
      );
    },
    async deleteUser(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await deleteUser(context.user.companyId, args.userId);
    },
  },
};
