import { IRole } from "../../interfaces/role.interface";
import { checkAbility } from "../../utils/ability";
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
      checkAbility(context.ability, "manage", "Role");
      return await findAll(context.user.companyId);
    },

    async listPermissionsByRole(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<[]> {
      checkAbility(context.ability, "manage", "Role");
      return await listPermissionsByRole(context.user.companyId, args.roleId);
    },
  },
  Mutation: {
    async createRole(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "Role");
      return await create(context.user.companyId, args.roleInput);
    },
    async updateRolePermissions(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IRole> {
      checkAbility(context.ability, "manage", "Role");
      return await updateRolePermissions(
        context.user.companyId,
        args.roleId,
        args.permissions
      );
    },
    async deleteRole(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "manage", "Role");
      return await deleteRole(context.user.companyId, args.roleId);
    },
  },
};
