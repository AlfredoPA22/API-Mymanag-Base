import {
  IPurchaseOrder,
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

      return await findAll(context.user.id);
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

      return await findDetail(args.purchaseOrderId);
    },

    async findPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrder> {
      const roleName = context.user.role;
      const permission = ["DETAIL_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await findPurchaseOrder(args.purchaseOrderId);
    },

    async findPurchaseOrderToPDF(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrderToPDF> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await findPurchaseOrderToPDF(args.purchaseOrderId);
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

      return await create(context.user.id, args.purchaseOrderInput);
    },
    async createPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await createDetail(args.purchaseOrderDetailInput);
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

      return await addSerialToOrder(args.addSerialToPurchaseOrderDetailInput);
    },
    async deleteSerialToPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deleteSerialToOrder(args.productSerialId);
    },
    async deleteProductToPurchaseOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deleteProductToOrder(args.purchaseOrderDetailId);
    },
    async deletePurchaseOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_PURCHASE"];
      await hasPermission(roleName, permission);

      return await deletePurchaseOrder(args.purchaseOrderId);
    },
    async approvePurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_PURCHASE", "EDIT_PURCHASE"];
      await hasPermission(roleName, permission);

      return await approve(args.purchaseOrderId);
    },
  },
};
