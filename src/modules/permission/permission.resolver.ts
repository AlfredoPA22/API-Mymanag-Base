import { IPermission } from "../../interfaces/permission.interface";
import { create, findAll } from "./permission.service";

export const permissionResolver = {
  Mutation: {
    async createPermission(_: any, args: Record<string, any>) {
      return await create(args.permissionInput);
    },
  },
  Query: {
    async listPermission(): Promise<IPermission[]> {
      return await findAll();
    },
  },
};
