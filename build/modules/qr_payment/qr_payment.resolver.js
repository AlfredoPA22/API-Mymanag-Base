"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrPaymentResolver = void 0;
const qr_payment_service_1 = require("./qr_payment.service");
exports.qrPaymentResolver = {
    Mutation: {
        async generateDepositQr(_, args, context) {
            if (!context.user) {
                throw new Error("No autorizado");
            }
            return await (0, qr_payment_service_1.generateDepositQr)(context.user.companyId, context.user.id, args.input);
        },
        async storeGenerateDepositQr(_, args, context) {
            if (!context.user || context.user.type !== "client") {
                throw new Error("No autorizado");
            }
            return await (0, qr_payment_service_1.generateDepositQrForClient)(context.user.companyId, context.user.clientId, args.input);
        },
    },
};
