import { IRole } from "../../interfaces/role.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
  create,
  deleteRole,
  findAll,
  listPermissionsByRole,
  updateRolePermissions,
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
      await hasPermission(roleName, permission, context.user.companyId);

      return await findAll(context.user.companyId);
    },

    async listPermissionsByRole(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<[]> {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await listPermissionsByRole(context.user.companyId, args.roleId);
    },
  },
  Mutation: {
    async createRole(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await create(context.user.companyId, args.roleInput);
    },
    async updateRolePermissions(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IRole> {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await updateRolePermissions(
        context.user.companyId,
        args.roleId,
        args.permissions
      );
    },
    async deleteRole(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["USER_AND_ROLE"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await deleteRole(context.user.companyId, args.roleId);
    },
  },
};
