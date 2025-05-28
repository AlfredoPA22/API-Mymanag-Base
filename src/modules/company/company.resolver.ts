import {
  ICompany,
  ICompanyWithPayment,
} from "../../interfaces/company.interface";
import {
  create,
  findAll,
  findAllAdmin
} from "./company.service";

export const companyResolver = {
  Query: {
    async listCompany(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICompanyWithPayment[]> {
      //   const roleName = context.user.role;
      //   const permission = ["GENERAL_ADMIN"];
      //   await hasPermission(roleName, permission);

      return await findAll(context.user.id);
    },

    async listCompanyAdmin(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICompany[]> {
      //   const roleName = context.user.role;
      //   const permission = ["GENERAL_ADMIN"];
      //   await hasPermission(roleName, permission);

      return await findAllAdmin(context.user.id);
    },
  },
  Mutation: {
    async createCompany(_: any, args: Record<string, any>, context: any) {
      //   const roleName = context.user.role;
      //   const permission = ["USER_AND_ROLE"];
      //   await hasPermission(roleName, permission);

      return await create(context.user.id, args.companyInput);
    },
  },
};
