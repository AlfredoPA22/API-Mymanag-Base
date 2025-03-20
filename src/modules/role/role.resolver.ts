import { create } from "./role.service";

export const roleResolver = {
  Mutation: {
    async createRole(_: any, args: Record<string, any>) {
      return await create(args.roleInput);
    },
  },
};
