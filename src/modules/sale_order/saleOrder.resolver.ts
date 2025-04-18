import {
  ISaleOrder,
  ISaleOrderToPDF,
  ISalesReportByCategory,
  ISalesReportByClient,
} from "../../interfaces/saleOrder.interface";
import { ISaleOrderDetail } from "../../interfaces/saleOrderDetail.interface";
import { hasPermission } from "../../utils/hasPermission";
import {
  addSerialToOrder,
  approve,
  create,
  createDetail,
  deleteProductToOrder,
  deleteSaleOrder,
  deleteSerialToOrder,
  findAll,
  findDetail,
  findSaleOrder,
  findSaleOrderToPDF,
  reportSaleOrderByCategory,
  reportSaleOrderByClient,
  reportSaleOrderByMonth,
  updateSaleOrderDetail,
} from "./saleOrder.service";

export const saleOrderResolver = {
  Query: {
    async listSaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE"];
      await hasPermission(roleName, permission);

      return await findAll(context.user.id);
    },
    async findSaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder> {
      const roleName = context.user.role;
      const permission = ["DETAIL_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await findSaleOrder(args.saleOrderId);
    },
    async listSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderDetail[]> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "DETAIL_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await findDetail(args.saleOrderId);
    },
    async findSaleOrderToPDF(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderToPDF> {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE"];
      await hasPermission(roleName, permission);

      return await findSaleOrderToPDF(args.saleOrderId);
    },

    async reportSaleOrderByClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportByClient[]> {
      const roleName = context.user.role;
      const permission = ["REPORT_SALE_ORDER_BY_CLIENT"];
      await hasPermission(roleName, permission);

      return await reportSaleOrderByClient(context.user.id);
    },

    async reportSaleOrderByCategory(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportByCategory[]> {
      const roleName = context.user.role;
      const permission = ["REPORT_SALE_ORDER_BY_CATEGORY"];
      await hasPermission(roleName, permission);

      return await reportSaleOrderByCategory(context.user.id);
    },

    async reportSaleOrderByMonth(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      const roleName = context.user.role;
      const permission = ["REPORT_SALE_ORDER_BY_MONTH"];
      await hasPermission(roleName, permission);

      return await reportSaleOrderByMonth(context.user.id);
    },
  },
  Mutation: {
    async createSaleOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE"];
      await hasPermission(roleName, permission);

      return await create(context.user.id, args.saleOrderInput);
    },
    async deleteSaleOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_SALE"];
      await hasPermission(roleName, permission);

      return await deleteSaleOrder(args.saleOrderId);
    },
    async createSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await createDetail(args.saleOrderDetailInput);
    },
    async updateSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await updateSaleOrderDetail(
        args.saleOrderDetailId,
        args.updateSaleOrderDetailInput
      );
    },
    async deleteProductToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await deleteProductToOrder(args.saleOrderDetailId);
    },
    async addSerialToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await addSerialToOrder(args.addSerialToSaleOrderDetailInput);
    },
    async deleteSerialToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await deleteSerialToOrder(args.productSerialId);
    },
    async approveSaleOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE", "EDIT_SALE"];
      await hasPermission(roleName, permission);

      return await approve(args.saleOrderId);
    },
  },
};
