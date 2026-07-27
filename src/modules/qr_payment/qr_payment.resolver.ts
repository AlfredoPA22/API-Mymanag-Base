import { generateDepositQr, generateDepositQrForClient } from "./qr_payment.service";
import { isMesaDePagosConfigured } from "../../utils/mesaDePagosClient";

export const qrPaymentResolver = {
  Query: {
    qrPaymentAvailable() {
      return isMesaDePagosConfigured();
    },
  },
  Mutation: {
    async generateDepositQr(_: any, args: Record<string, any>, context: any) {
      if (!context.user) {
        throw new Error("No autorizado");
      }
      return await generateDepositQr(
        context.user.companyId,
        context.user.id,
        args.input
      );
    },
    async storeGenerateDepositQr(_: any, args: Record<string, any>, context: any) {
      if (!context.user || context.user.type !== "client") {
        throw new Error("No autorizado");
      }
      return await generateDepositQrForClient(
        context.user.companyId,
        context.user.clientId,
        args.input
      );
    },
  },
};
