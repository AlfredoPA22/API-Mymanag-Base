import {
  IPurchaseOrder,
  IPurchaseOrderByProduct,
  IPurchaseOrderToPDF,
} from "../../interfaces/purchaseOrder.interface";
import { IPurchaseOrderDetail } from "../../interfaces/purchaseOrderDetail.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
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
      checkAbility(context.ability, "list", "Purchase");
      return await findAll(context.user.companyId, context.user.id);
    },
    async listPurchaseOrderByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrderByProduct[]> {
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
      checkAnyAbility(context.ability, [
        ["list", "Purchase"],
        ["read", "Purchase"],
        ["update", "Purchase"],
      ]);
      return await findDetail(context.user.companyId, args.purchaseOrderId);
    },
    async findPurchaseOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IPurchaseOrder> {
      checkAnyAbility(context.ability, [
        ["read", "Purchase"],
        ["update", "Purchase"],
      ]);
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
      checkAbility(context.ability, "list", "Purchase");
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
      checkAbility(context.ability, "read", "PurchaseReport");
      return await purchaseOrderReport(
        context.user.companyId,
        context.user.id,
        args.filterPurchaseOrderInput
      );
    },
  },
  Mutation: {
    async createPurchaseOrder(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "Purchase");
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
      return await deleteProductToOrder(
        context.user.companyId,
        args.purchaseOrderDetailId
      );
    },
    async deletePurchaseOrder(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Purchase");
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
      checkAnyAbility(context.ability, [
        ["create", "Purchase"],
        ["update", "Purchase"],
      ]);
      return await approve(context.user.companyId, args.purchaseOrderId);
    },
  },
};
