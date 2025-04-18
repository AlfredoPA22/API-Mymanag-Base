import { IRole } from "../../interfaces/role.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
  create,
  deleteRole,
  findAll,
  listPermissionsByRole,
} from "./role.service";

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

    async listPermissionsByRole(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<[]> {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await listPermissionsByRole(args.roleId);
    },
  },
  Mutation: {
    async createRole(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await create(args.roleInput);
    },
    async deleteRole(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission);

      return await deleteRole(args.roleId);
    },
  },
};
