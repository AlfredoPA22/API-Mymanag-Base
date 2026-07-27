"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockResolver = void 0;
const stock_service_1 = require("./stock.service");
exports.stockResolver = {
    Query: {
        async auditStock(_, _args, context) {
            return await (0, stock_service_1.auditStock)(context.user.id);
        },
    },
    Mutation: {
        async reconcileStock(_, _args, context) {
            return await (0, stock_service_1.reconcileStock)(context.user.id);
        },
    },
};
