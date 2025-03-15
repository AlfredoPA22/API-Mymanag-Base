import { readFileSync } from "fs";
import path from "path";
import { brandResolver } from "../modules/brand/brand.resolver";
import { categoryResolver } from "../modules/category/category.resolver";
import { codeGeneratorResolver } from "../modules/codeGenerator/codeGenerator.resolver";
import { productResolver } from "../modules/product/product.resolver";
import { purchaseOrderResolver } from "../modules/purchase_order/purchaseOrder.resolver";
import { clientResolver } from "../modules/client/client.resolver";
import { saleOrderResolver } from "../modules/sale_order/saleOrder.resolver";
import { providerResolver } from "../modules/provider/provider.resolver";
import { userResolver } from "../modules/user/user.resolver";

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
    // ...restaurantResolver.Query,
    ...brandResolver.Query,
    ...categoryResolver.Query,
    ...productResolver.Query,
    ...clientResolver.Query,
    ...codeGeneratorResolver.Query,
    ...purchaseOrderResolver.Query,
    ...saleOrderResolver.Query,
    ...providerResolver.Query,
  },
  Mutation: {
    // ...restaurantResolver.Mutation,
    ...brandResolver.Mutation,
    ...categoryResolver.Mutation,
    ...productResolver.Mutation,
    ...clientResolver.Mutation,
    ...purchaseOrderResolver.Mutation,
    ...saleOrderResolver.Mutation,
    ...providerResolver.Mutation,
    ...userResolver.Mutation,
  },
};
