import { existsSync, readFileSync } from "fs";
import path from "path";
import { brandResolver } from "../modules/brand/brand.resolver";
import { categoryResolver } from "../modules/category/category.resolver";
import { clientResolver } from "../modules/client/client.resolver";
import { codeGeneratorResolver } from "../modules/codeGenerator/codeGenerator.resolver";
import { permissionResolver } from "../modules/permission/permission.resolver";
import { productResolver } from "../modules/product/product.resolver";
import { ProductTransferResolver } from "../modules/product_transfer/productTransfer.resolver";
import { providerResolver } from "../modules/provider/provider.resolver";
import { purchaseOrderResolver } from "../modules/purchase_order/purchaseOrder.resolver";
import { roleResolver } from "../modules/role/role.resolver";
import { saleOrderResolver } from "../modules/sale_order/saleOrder.resolver";
import { salePaymentResolver } from "../modules/sale_payment/salePayment.resolver";
import { userResolver } from "../modules/user/user.resolver";
import { warehouseResolver } from "../modules/warehouse/warehouse.resolver";
import { companyResolver } from "../modules/company/company.resolver";
import { userLandingResolver } from "../modules/user_landing/user_landing.resolver";
import { paymentLandingResolver } from "../modules/payment_landing/payment_landing.resolver";
import { stockResolver } from "../modules/stock/stock.resolver";
import { saleReturnResolver } from "../modules/sale_return/saleReturn.resolver";
import { kardexResolver } from "../modules/kardex/kardex.resolver";
import { profitabilityResolver } from "../modules/profitability/profitability.resolver";
import { storeResolver } from "../modules/store/store.resolver";
import { storeAuthResolver } from "../modules/store_auth/storeAuth.resolver";
import { notificationResolver } from "../modules/notification/notification.resolver";

const schemaPath = path.join(__dirname, "./schema.graphql");

if (!existsSync(schemaPath)) {
  throw new Error(`Schema GraphQL no encontrado en ${schemaPath}`);
}

const schemaTypes = readFileSync(schemaPath, {
  encoding: "utf-8",
});

export const typeDefs = `
  ${schemaTypes}
`;

export const resolvers = {
  Query: {
    ...brandResolver.Query,
    ...categoryResolver.Query,
    ...productResolver.Query,
    ...clientResolver.Query,
    ...codeGeneratorResolver.Query,
    ...purchaseOrderResolver.Query,
    ...saleOrderResolver.Query,
    ...providerResolver.Query,
    ...userResolver.Query,
    ...roleResolver.Query,
    ...permissionResolver.Query,
    ...warehouseResolver.Query,
    ...salePaymentResolver.Query,
    ...companyResolver.Query,
    ...paymentLandingResolver.Query,
    ...ProductTransferResolver.Query,
    ...stockResolver.Query,
    ...saleReturnResolver.Query,
    ...kardexResolver.Query,
    ...profitabilityResolver.Query,
    ...storeResolver.Query,
    ...storeAuthResolver.Query,
    ...notificationResolver.Query,
  },
  Mutation: {
    ...brandResolver.Mutation,
    ...categoryResolver.Mutation,
    ...productResolver.Mutation,
    ...clientResolver.Mutation,
    ...purchaseOrderResolver.Mutation,
    ...saleOrderResolver.Mutation,
    ...providerResolver.Mutation,
    ...userResolver.Mutation,
    ...roleResolver.Mutation,
    ...permissionResolver.Mutation,
    ...warehouseResolver.Mutation,
    ...salePaymentResolver.Mutation,
    ...ProductTransferResolver.Mutation,
    ...companyResolver.Mutation,
    ...userLandingResolver.Mutation,
    ...paymentLandingResolver.Mutation,
    ...stockResolver.Mutation,
    ...saleReturnResolver.Mutation,
    ...storeResolver.Mutation,
    ...storeAuthResolver.Mutation,
    ...notificationResolver.Mutation,
  },
};
