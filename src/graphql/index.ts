import { readFileSync } from "fs";
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

const schemaTypes = readFileSync(
  path.join(__dirname, "./typeDefs/schema.graphql"),
  {
    encoding: "utf-8",
  }
);

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
  },
};
