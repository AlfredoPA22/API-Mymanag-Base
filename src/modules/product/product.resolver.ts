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
} from "./product.service";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import { IGeneralData } from "../../interfaces/home.interface";
import { hasPermission } from "../../utils/hasPermission";
import { IProductInventory } from "../../interfaces/productInventory.interface";

export const productResolver = {
  Query: {
    async listProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_PRODUCT",
        "LIST_AND_CREATE_PURCHASE",
        "LIST_AND_CREATE_SALE",
        "EDIT_SALE",
        "EDIT_PURCHASE",
      ];
      await hasPermission(roleName, permission);

      return await findAll(context.user.companyId);
    },

    async listProductWithParams(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_PRODUCT",
        "LIST_AND_CREATE_BRAND",
        "LIST_AND_CREATE_CATEGORY",
        "LIST_AND_CREATE_WAREHOUSE",
      ];
      await hasPermission(roleName, permission);

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
      const roleName = context.user.role;
      const permission = ["FIND_PRODUCT"];
      await hasPermission(roleName, permission);

      return await findProduct(context.user.companyId, args.productId);
    },

    async listProductSerialByPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_PURCHASE",
        "EDIT_PURCHASE",
        "DETAIL_PURCHASE",
      ];
      await hasPermission(roleName, permission);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE", "DETAIL_SALE"];
      await hasPermission(roleName, permission);

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
      const roleName = context.user.role;
      const permission = ["LIST_PRODUCT_SERIAL_BY_PRODUCT"];
      await hasPermission(roleName, permission);

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
      const roleName = context.user.role;
      const permission = ["LIST_PRODUCT_INVENTORY_BY_PRODUCT"];
      await hasPermission(roleName, permission);

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
      const roleName = context.user.role;
      const permission = ["SEARCH_PRODUCT"];
      await hasPermission(roleName, permission);

      return await searchProduct(context.user.companyId, args.serial);
    },

    async generalData(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IGeneralData> {
      const roleName = context.user.role;
      const permission = ["GENERAL_DATA"];
      await hasPermission(roleName, permission);

      return await generalData(context.user.companyId, context.user.id);
    },

    async productReport(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      const roleName = context.user.role;
      const permission = ["PRODUCT_REPORT"];
      await hasPermission(roleName, permission);

      return await productReport(
        context.user.companyId,
        args.filterProductInput
      );
    },
  },
  Mutation: {
    async createProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await createProduct(context.user.companyId, args.productInput);
    },
    async deleteProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await deleteProduct(context.user.companyId, args.productId);
    },
    async updateProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await update(
        context.user.companyId,
        args.productId,
        args.updateProductInput
      );
    },
  },
};
