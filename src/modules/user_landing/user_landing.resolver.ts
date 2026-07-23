import { listUserLandingAdmin, loginLanding } from "./user_landing.service";


export const userLandingResolver = {
  Query: {
    async listUserLandingAdmin(_: any, args: Record<string, any>, context: any) {
      return await listUserLandingAdmin(context.user.id);
    },
  },

  Mutation: {
    async loginLanding(_: any, args: Record<string, any>) {
      try {
        return await loginLanding(args.loginLandingInput);
      } catch (error: any) {
        console.error("[loginLanding error]", error?.message || error);
        throw new Error(error?.message || "Error en autenticación con Google");
      }
    },
  },
};
