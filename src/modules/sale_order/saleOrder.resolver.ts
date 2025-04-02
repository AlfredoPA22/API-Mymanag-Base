import {
  ISaleOrder,
  ISaleOrderByYear,
  ISaleOrderToPDF,
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
  updateSaleOrderDetail,
  reportSaleOrderByYear,
  reportEarningsByYear,
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

      return await findAll();
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
    async reportSaleOrderByYear(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByYear[]> {
      return await reportSaleOrderByYear();
    },
    async reportEarningsByYear(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByYear[]> {
      return await reportEarningsByYear();
    },
  },
  Mutation: {
    async createSaleOrder(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_SALE"];
      await hasPermission(roleName, permission);

      return await create(args.saleOrderInput);
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
