"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentLandingResolver = void 0;
const payment_landing_service_1 = require("./payment_landing.service");
exports.paymentLandingResolver = {
    Query: {
        async listPaymentLandingByCompany(_, args, context) {
            return await (0, payment_landing_service_1.listPaymentLandingByCompany)(context.user.id, args.companyId);
        },
    },
    Mutation: {
        async createPaymentLanding(_, args, context) {
            return await (0, payment_landing_service_1.createPaymentLanding)(context.user.id, args.paymentLandingInput);
        },
        async approvePaymentLanding(_, args, context) {
            return await (0, payment_landing_service_1.approvePaymentLanding)(context.user.id, args.paymentId);
        },
        async rejectPaymentLanding(_, args, context) {
            return await (0, payment_landing_service_1.rejectPaymentLanding)(context.user.id, args.paymentId);
        },
        async updatePaymentLanding(_, args, context) {
            return await (0, payment_landing_service_1.updatePaymentLanding)(context.user.id, args.paymentId, args.proof_url);
        },
        async generateDepositQrForLanding(_, args, context) {
            if (!context.user)
                throw new Error("No autorizado");
            return await (0, payment_landing_service_1.generateDepositQrForLanding)(context.user.id, args.companyId, args.plan, args.system, {
                name: args.billing_name,
                nit: args.billing_nit,
                email: args.billing_email,
            });
        },
    },
};
