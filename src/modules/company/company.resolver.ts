import {
  ICompany,
  ICompanyWithPayment,
} from "../../interfaces/company.interface";
import {
  adjustSubscription,
  create,
  detailCompany,
  findAll,
  findAllAdmin,
  update,
} from "./company.service";
import { checkAbility } from "../../utils/ability";

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
    async detailCompany(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ICompany> {
      return await detailCompany(context.user.companyId);
    },
  },
  Mutation: {
    async createCompany(_: any, args: Record<string, any>, context: any) {
      return await create(context.user.id, args.companyInput);
    },
    async updateCompany(_: any, args: Record<string, any>, context: any): Promise<ICompany> {
      checkAbility(context.ability, "update", "Company");
      return await update(context.user.companyId, args.updateCompanyInput);
    },
    async adjustSubscription(_: any, args: Record<string, any>, context: any): Promise<ICompany> {
      return await adjustSubscription(context.user.id, args.input);
    },
  },
};
