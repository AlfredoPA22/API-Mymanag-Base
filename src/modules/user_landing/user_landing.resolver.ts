import { loginLanding } from "./user_landing.service";


export const userLandingResolver = {
//   Query: {
//     async listUser(
//       _: any,
//       args: Record<string, any>,
//       context: any
//     ): Promise<IUser[]> {
//       const roleName = context.user.role;
//       const permission = ["USER_AND_ROLE"];
//       await hasPermission(roleName, permission);

//       return await findAll(context.user.companyId);
//     },
//   },
  Mutation: {
    // async createUser(_: any, args: Record<string, any>, context: any) {
    //   return await create(context.user.companyId, args.userInput);
    // },
    async loginLanding(_: any, args: Record<string, any>) {
      return await loginLanding(args.loginLandingInput);
    },
    // async switchUserState(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["USER_AND_ROLE"];
    //   await hasPermission(roleName, permission);

    //   return await switchUserState(context.user.companyId, args.userId);
    // },
    // async updateUser(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["USER_AND_ROLE"];
    //   await hasPermission(roleName, permission);

    //   return await update(
    //     context.user.companyId,
    //     args.userId,
    //     args.updateUserInput
    //   );
    // },
    // async deleteUser(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["USER_AND_ROLE"];
    //   await hasPermission(roleName, permission);

    //   return await deleteUser(context.user.companyId, args.userId);
    // },
  },
};
