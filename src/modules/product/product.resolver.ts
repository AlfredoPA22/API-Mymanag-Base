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
} from "./product.service";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import { IGeneralData } from "../../interfaces/home.interface";
import { hasPermission } from "../../utils/hasPermission";

export const productResolver = {
  Query: {
    async listProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_PRODUCT",
        "LIST_AND_CREATE_PURCHASE",
        "LIST_AND_CREATE_SALE",
        "EDIT_SALE",
        "EDIT_PURCHASE",
      ];
      await hasPermission(roleName, permission);

      return await findAll();
    },

    async findProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct> {
      const roleName = context.user.role;
      const permission = ["FIND_PRODUCT"];
      await hasPermission(roleName, permission);

      return await findProduct(args.productId);
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

      return await listProductSerialByPurchaseOrder(args.purchaseOrderDetailId);
    },

    async listProductSerialBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_SALE",
        "EDIT_SALE",
        "DETAIL_SALE",
      ];
      await hasPermission(roleName, permission);

      return await listProductSerialBySaleOrder(args.saleOrderDetailId);
    },

    async listProductSerialByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductSerial[]> {
      const roleName = context.user.role;
      const permission = ["LIST_PRODUCT_SERIAL_BY_PRODUCT"];
      await hasPermission(roleName, permission);

      return await listProductSerialByProduct(args.productId);
    },

    async searchProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProduct> {
      const roleName = context.user.role;
      const permission = ["SEARCH_PRODUCT"];
      await hasPermission(roleName, permission);

      return await searchProduct(args.serial);
    },

    async generalData(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IGeneralData> {
      const roleName = context.user.role;
      const permission = ["GENERAL_DATA"];
      await hasPermission(roleName, permission);

      return await generalData();
    },
  },
  Mutation: {
    async createProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await createProduct(args.productInput);
    },
    async deleteProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await deleteProduct(args.productId);
    },
    async updateProduct(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_PRODUCT"];
      await hasPermission(roleName, permission);

      return await update(args.productId, args.updateProductInput);
    },
  },
};
