import { IPaymentLanding } from "../../interfaces/paymentLanding.interface";
import {
  approvePaymentLanding,
  createPaymentLanding,
  generateDepositQrForLanding,
  listPaymentLandingByCompany,
  rejectPaymentLanding,
  updatePaymentLanding,
} from "./payment_landing.service";

export const paymentLandingResolver = {
  Query: {
    async listPaymentLandingByCompany(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPaymentLanding[]> {
      return await listPaymentLandingByCompany(context.user.id, args.companyId);
    },
  },
  Mutation: {
    async createPaymentLanding(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      return await createPaymentLanding(
        context.user.id,
        args.paymentLandingInput
      );
    },

    async approvePaymentLanding(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      return await approvePaymentLanding(context.user.id, args.paymentId);
    },

    async rejectPaymentLanding(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      return await rejectPaymentLanding(context.user.id, args.paymentId);
    },

    async updatePaymentLanding(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      return await updatePaymentLanding(
        context.user.id,
        args.paymentId,
        args.proof_url
      );
    },

    async generateDepositQrForLanding(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      if (!context.user) throw new Error("No autorizado");
      return await generateDepositQrForLanding(
        context.user.id,
        args.companyId,
        args.plan,
        args.system,
        {
          name: args.billing_name,
          nit: args.billing_nit,
          email: args.billing_email,
        }
      );
    },
  },
};
