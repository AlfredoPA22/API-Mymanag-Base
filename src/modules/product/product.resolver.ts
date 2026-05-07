import {
  createProduct,
  deleteProduct,
  findAll,
  listProductSerialByPurchaseOrder,
  listProductSerialBySaleOrder,
  listProductSerialByProduct,
  update,
  searchProduct,
  generalData,
  findProduct,
  findAllWithParams,
  listProductInventoryByProduct,
  productReport,
  listLowStockProduct,
  previewImportProducts,
  saveImportProducts,
} from "./product.service";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import { IGeneralData } from "../../interfaces/home.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import { IProductInventory } from "../../interfaces/productInventory.interface";

export const productResolver = {
  Query: {
    async listProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      checkAnyAbility(context.ability, [
        ["list", "Product"],
        ["list", "Purchase"],
        ["list", "Sale"],
        ["update", "Sale"],
        ["update", "Purchase"],
      ]);
      return await findAll(context.user.companyId);
    },
    async listLowStockProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      checkAbility(context.ability, "list", "Product");
      return await listLowStockProduct(context.user.companyId);
    },
    async listProductWithParams(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      checkAnyAbility(context.ability, [
        ["list", "Product"],
        ["list", "Brand"],
        ["list", "Category"],
        ["list", "Warehouse"],
      ]);
      return await findAllWithParams(
        context.user.companyId,
        args.categoryId,
        args.brandId,
        args.warehouseId
      );
    },
    async findProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct> {
      checkAbility(context.ability, "read", "Product");
      return await findProduct(context.user.companyId, args.productId);
    },
    async listProductSerialByPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      checkAnyAbility(context.ability, [
        ["list", "Purchase"],
        ["update", "Purchase"],
        ["read", "Purchase"],
      ]);
      return await listProductSerialByPurchaseOrder(
        context.user.companyId,
        args.purchaseOrderDetailId
      );
    },
    async listProductSerialBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      checkAnyAbility(context.ability, [
        ["list", "Sale"],
        ["update", "Sale"],
        ["read", "Sale"],
      ]);
      return await listProductSerialBySaleOrder(
        context.user.companyId,
        args.saleOrderDetailId
      );
    },
    async listProductSerialByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      checkAbility(context.ability, "listSerials", "Product");
      return await listProductSerialByProduct(
        context.user.companyId,
        args.productId
      );
    },
    async listProductInventoryByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductInventory[]> {
      checkAbility(context.ability, "listInventory", "Product");
      return await listProductInventoryByProduct(
        context.user.companyId,
        args.productId
      );
    },
    async searchProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct> {
      checkAbility(context.ability, "search", "Product");
      return await searchProduct(context.user.companyId, args.serial);
    },
    async generalData(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IGeneralData> {
      checkAbility(context.ability, "read", "GeneralData");
      return await generalData(context.user.companyId, context.user.id, args.startDate, args.endDate);
    },
    async productReport(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      checkAbility(context.ability, "read", "ProductReport");
      return await productReport(
        context.user.companyId,
        args.filterProductInput
      );
    },
  },
  Mutation: {
    async createProduct(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "Product");
      return await createProduct(context.user.companyId, args.productInput);
    },
    async deleteProduct(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Product");
      return await deleteProduct(context.user.companyId, args.productId);
    },
    async updateProduct(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Product");
      return await update(
        context.user.companyId,
        args.productId,
        args.updateProductInput
      );
    },
    async saveImportProducts(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "Product");
      return await saveImportProducts(
        context.user.companyId,
        args.importProducts
      );
    },
  },
};
