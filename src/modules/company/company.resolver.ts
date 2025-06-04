import {
  ICompany,
  ICompanyWithPayment,
} from "../../interfaces/company.interface";
import { create, findAll, findAllAdmin } from "./company.service";

export const companyResolver = {
  Query: {
    async listCompany(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICompanyWithPayment[]> {
      return await findAll(context.user.id);
    },

    async listCompanyAdmin(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICompany[]> {
      return await findAllAdmin(context.user.id);
    },
  },
  Mutation: {
    async createCompany(_: any, args: Record<string, any>, context: any) {
      return await create(context.user.id, args.companyInput);
    },
  },
};
