import { IUser } from "../../interfaces/user.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
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

      return await findAll();
    },
  },
  Mutation: {
    async createUser(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await create(args.userInput);
    },
    async login(_: any, args: Record<string, any>) {
      return await login(args.loginInput);
    },
    async switchUserState(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await switchUserState(args.userId);
    },
    async updateUser(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await update(args.userId, args.updateUserInput);
    },
    async deleteUser(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await deleteUser(args.userId);
    },
  },
};
