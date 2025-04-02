import { IRole } from "../../interfaces/role.interface";
import { hasPermission } from "../../utils/hasPermission";
import { create, findAll } from "./role.service";

export const roleResolver = {
  Query: {
    async listRole(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IRole[]> {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createRole(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await create(args.roleInput);
    },
  },
};
