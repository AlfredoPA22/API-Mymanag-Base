import {
  IPurchaseOrder,
  IPurchaseOrderByProduct,
  IPurchaseOrderToPDF,
} from "../../interfaces/purchaseOrder.interface";
import { IPurchaseOrderDetail } from "../../interfaces/purchaseOrderDetail.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
  addSerialToOrder,
  approve,
  create,
  createDetail,
  deleteProductToOrder,
  deletePurchaseOrder,
  deleteSerialToOrder,
  findAll,
  findDetail,
  findPurchaseOrder,
  findPurchaseOrderToPDF,
  listPurchaseOrderByProduct,
  purchaseOrderReport,
  updatePurchaseOrderDetail,
} from "./purchaseOrder.service";

export const purchaseOrderResolver = {
  Query: {
    async listPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrder[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await findAll(context.user.companyId, context.user.id);
    },

    async listPurchaseOrderByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrderByProduct[]> {
      // const roleName = context.user.role;
      // const permission = ["LIST_AND_CREATE_SALE"];
      // await hasPermission(roleName, permission);

      return await listPurchaseOrderByProduct(
        context.user.companyId,
        context.user.id,
        args.productId
      );
    },

    async listPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrderDetail[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_PURCHASE",
        "DETAIL_PURCHASE",
        "EDIT_PURCHASE",
      ];
      await hasPermission(roleName, permission);

      return await findDetail(context.user.companyId, args.purchaseOrderId);
    },

    async findPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrder> {
      const roleName = context.user.role;
      const permission = ["DETAIL_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await findPurchaseOrder(
        context.user.companyId,
        args.purchaseOrderId
      );
    },

    async findPurchaseOrderToPDF(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrderToPDF> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await findPurchaseOrderToPDF(
        context.user.companyId,
        args.purchaseOrderId
      );
    },

    async purchaseOrderReport(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrder[]> {
      const roleName = context.user.role;
      const permission = ["PURCHASE_ORDER_REPORT"];
      await hasPermission(roleName, permission);

      return await purchaseOrderReport(
        context.user.companyId,
        context.user.id,
        args.filterPurchaseOrderInput
      );
    },
  },
  Mutation: {
    async createPurchaseOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await create(
        context.user.companyId,
        context.user.id,
        args.purchaseOrderInput
      );
    },
    async createPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await createDetail(
        context.user.companyId,
        args.purchaseOrderDetailInput
      );
    },
    async updatePurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await updatePurchaseOrderDetail(
        context.user.companyId,
        args.purchaseOrderDetailId,
        args.updatePurchaseOrderDetailInput
      );
    },
    async addSerialToPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await addSerialToOrder(
        context.user.companyId,
        args.addSerialToPurchaseOrderDetailInput
      );
    },
    async deleteSerialToPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deleteSerialToOrder(
        context.user.companyId,
        args.productSerialId
      );
    },
    async deleteProductToPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deleteProductToOrder(
        context.user.companyId,
        args.purchaseOrderDetailId
      );
    },
    async deletePurchaseOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deletePurchaseOrder(
        context.user.companyId,
        args.purchaseOrderId
      );
    },
    async approvePurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await approve(context.user.companyId, args.purchaseOrderId);
    },
  },
};
