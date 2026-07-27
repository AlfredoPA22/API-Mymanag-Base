"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userLandingResolver = void 0;
const user_landing_service_1 = require("./user_landing.service");
exports.userLandingResolver = {
    Query: {
        async listUserLandingAdmin(_, args, context) {
            return await (0, user_landing_service_1.listUserLandingAdmin)(context.user.id);
        },
    },
    Mutation: {
        async loginLanding(_, args) {
            try {
                return await (0, user_landing_service_1.loginLanding)(args.loginLandingInput);
            }
            catch (error) {
                console.error("[loginLanding error]", error?.message || error);
                throw new Error(error?.message || "Error en autenticación con Google");
            }
        },
    },
};
