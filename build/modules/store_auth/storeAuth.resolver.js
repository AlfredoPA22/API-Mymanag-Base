"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAuthResolver = void 0;
const storeAuth_service_1 = require("./storeAuth.service");
const requireClient = (context) => {
    if (!context.user || context.user.type !== "client") {
        throw new Error("No autorizado");
    }
    return { companyId: context.user.companyId, clientId: context.user.clientId };
};
exports.storeAuthResolver = {
    Query: {
        async storeMe(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return await (0, storeAuth_service_1.getMe)(companyId, clientId);
        },
        async storeMyOrders(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return (await (0, storeAuth_service_1.listOrdersByClient)(companyId, clientId));
        },
        async storeOrderDetail(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return await (0, storeAuth_service_1.getOrderDetail)(companyId, clientId, args.orderId);
        },
    },
    Mutation: {
        async storeRegister(_, args) {
            return await (0, storeAuth_service_1.registerClient)(args.companyId, args.input);
        },
        async storeLogin(_, args) {
            return await (0, storeAuth_service_1.loginClient)(args.companyId, args.phoneNumber, args.password);
        },
        async storeUpdateCart(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return await (0, storeAuth_service_1.updateCart)(companyId, clientId, args.items);
        },
        async storeCreateOrderForClient(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return await (0, storeAuth_service_1.createOrderForClient)(companyId, clientId, args.items, args.address, args.contado_payment_method);
        },
        async storeUpdateProfile(_, args, context) {
            const { companyId, clientId } = requireClient(context);
            return await (0, storeAuth_service_1.updateProfile)(companyId, clientId, args.input);
        },
    },
};
