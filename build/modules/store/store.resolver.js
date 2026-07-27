"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeResolver = void 0;
const store_service_1 = require("./store.service");
exports.storeResolver = {
    Query: {
        async storeListProducts(_, args) {
            return await (0, store_service_1.listStoreProducts)(args.companyId);
        },
    },
    Mutation: {
        async storeCreateOrder(_, args) {
            return await (0, store_service_1.createStoreOrder)(args.companyId, args.storeOrderInput);
        },
    },
};
