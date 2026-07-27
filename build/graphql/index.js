"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const brand_resolver_1 = require("../modules/brand/brand.resolver");
const category_resolver_1 = require("../modules/category/category.resolver");
const client_resolver_1 = require("../modules/client/client.resolver");
const codeGenerator_resolver_1 = require("../modules/codeGenerator/codeGenerator.resolver");
const permission_resolver_1 = require("../modules/permission/permission.resolver");
const product_resolver_1 = require("../modules/product/product.resolver");
const productTransfer_resolver_1 = require("../modules/product_transfer/productTransfer.resolver");
const provider_resolver_1 = require("../modules/provider/provider.resolver");
const purchaseOrder_resolver_1 = require("../modules/purchase_order/purchaseOrder.resolver");
const role_resolver_1 = require("../modules/role/role.resolver");
const saleOrder_resolver_1 = require("../modules/sale_order/saleOrder.resolver");
const salePayment_resolver_1 = require("../modules/sale_payment/salePayment.resolver");
const user_resolver_1 = require("../modules/user/user.resolver");
const warehouse_resolver_1 = require("../modules/warehouse/warehouse.resolver");
const company_resolver_1 = require("../modules/company/company.resolver");
const user_landing_resolver_1 = require("../modules/user_landing/user_landing.resolver");
const payment_landing_resolver_1 = require("../modules/payment_landing/payment_landing.resolver");
const stock_resolver_1 = require("../modules/stock/stock.resolver");
const saleReturn_resolver_1 = require("../modules/sale_return/saleReturn.resolver");
const kardex_resolver_1 = require("../modules/kardex/kardex.resolver");
const profitability_resolver_1 = require("../modules/profitability/profitability.resolver");
const store_resolver_1 = require("../modules/store/store.resolver");
const storeAuth_resolver_1 = require("../modules/store_auth/storeAuth.resolver");
const notification_resolver_1 = require("../modules/notification/notification.resolver");
const qr_payment_resolver_1 = require("../modules/qr_payment/qr_payment.resolver");
const schemaPath = path_1.default.join(__dirname, "./schema.graphql");
if (!(0, fs_1.existsSync)(schemaPath)) {
    throw new Error(`Schema GraphQL no encontrado en ${schemaPath}`);
}
const schemaTypes = (0, fs_1.readFileSync)(schemaPath, {
    encoding: "utf-8",
});
exports.typeDefs = `
  ${schemaTypes}
`;
exports.resolvers = {
    Query: {
        ...brand_resolver_1.brandResolver.Query,
        ...category_resolver_1.categoryResolver.Query,
        ...product_resolver_1.productResolver.Query,
        ...client_resolver_1.clientResolver.Query,
        ...codeGenerator_resolver_1.codeGeneratorResolver.Query,
        ...purchaseOrder_resolver_1.purchaseOrderResolver.Query,
        ...saleOrder_resolver_1.saleOrderResolver.Query,
        ...provider_resolver_1.providerResolver.Query,
        ...user_resolver_1.userResolver.Query,
        ...role_resolver_1.roleResolver.Query,
        ...permission_resolver_1.permissionResolver.Query,
        ...warehouse_resolver_1.warehouseResolver.Query,
        ...salePayment_resolver_1.salePaymentResolver.Query,
        ...company_resolver_1.companyResolver.Query,
        ...payment_landing_resolver_1.paymentLandingResolver.Query,
        ...productTransfer_resolver_1.ProductTransferResolver.Query,
        ...stock_resolver_1.stockResolver.Query,
        ...saleReturn_resolver_1.saleReturnResolver.Query,
        ...kardex_resolver_1.kardexResolver.Query,
        ...profitability_resolver_1.profitabilityResolver.Query,
        ...store_resolver_1.storeResolver.Query,
        ...storeAuth_resolver_1.storeAuthResolver.Query,
        ...notification_resolver_1.notificationResolver.Query,
        ...user_landing_resolver_1.userLandingResolver.Query,
    },
    Mutation: {
        ...brand_resolver_1.brandResolver.Mutation,
        ...category_resolver_1.categoryResolver.Mutation,
        ...product_resolver_1.productResolver.Mutation,
        ...client_resolver_1.clientResolver.Mutation,
        ...purchaseOrder_resolver_1.purchaseOrderResolver.Mutation,
        ...saleOrder_resolver_1.saleOrderResolver.Mutation,
        ...provider_resolver_1.providerResolver.Mutation,
        ...user_resolver_1.userResolver.Mutation,
        ...role_resolver_1.roleResolver.Mutation,
        ...permission_resolver_1.permissionResolver.Mutation,
        ...warehouse_resolver_1.warehouseResolver.Mutation,
        ...salePayment_resolver_1.salePaymentResolver.Mutation,
        ...productTransfer_resolver_1.ProductTransferResolver.Mutation,
        ...company_resolver_1.companyResolver.Mutation,
        ...user_landing_resolver_1.userLandingResolver.Mutation,
        ...payment_landing_resolver_1.paymentLandingResolver.Mutation,
        ...stock_resolver_1.stockResolver.Mutation,
        ...saleReturn_resolver_1.saleReturnResolver.Mutation,
        ...store_resolver_1.storeResolver.Mutation,
        ...storeAuth_resolver_1.storeAuthResolver.Mutation,
        ...notification_resolver_1.notificationResolver.Mutation,
        ...qr_payment_resolver_1.qrPaymentResolver.Mutation,
    },
};
