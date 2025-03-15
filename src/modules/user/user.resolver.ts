import { create, login} from "./user.service";

export const userResolver = {
  Mutation: {
    async createUser(_: any, args: Record<string, any>) {
      return await create(args.userInput);
    },
    async login(_: any, args: Record<string, any>) {
      return await login(args.loginInput);
    },
  },
};
