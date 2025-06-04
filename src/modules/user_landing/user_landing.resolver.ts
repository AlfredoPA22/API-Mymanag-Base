import { loginLanding } from "./user_landing.service";


export const userLandingResolver = {

  Mutation: {
    async loginLanding(_: any, args: Record<string, any>) {
      return await loginLanding(args.loginLandingInput);
    },
  },
};
