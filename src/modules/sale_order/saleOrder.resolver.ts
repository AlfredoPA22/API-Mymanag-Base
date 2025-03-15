import {
  ISaleOrder,
  ISaleOrderByYear,
  ISaleOrderToPDF,
} from "../../interfaces/saleOrder.interface";
import { ISaleOrderDetail } from "../../interfaces/saleOrderDetail.interface";
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
    async listSaleOrder(): Promise<ISaleOrder[]> {
      return await findAll();
    },
    async findSaleOrder(
      _: any,
      args: Record<string, any>
    ): Promise<ISaleOrder> {
      return await findSaleOrder(args.saleOrderId);
    },
    async listSaleOrderDetail(
      _: any,
      args: Record<string, any>
    ): Promise<ISaleOrderDetail[]> {
      return await findDetail(args.saleOrderId);
    },
    async findSaleOrderToPDF(
      _: any,
      args: Record<string, any>
    ): Promise<ISaleOrderToPDF> {
      return await findSaleOrderToPDF(args.saleOrderId);
    },
    async reportSaleOrderByYear(): Promise<ISaleOrderByYear[]> {
      return await reportSaleOrderByYear();
    },
    async reportEarningsByYear(): Promise<ISaleOrderByYear[]> {
      return await reportEarningsByYear();
    },
  },
  Mutation: {
    async createSaleOrder(_: any, args: Record<string, any>) {
      return await create(args.saleOrderInput);
    },
    async deleteSaleOrder(_: any, args: Record<string, any>) {
      return await deleteSaleOrder(args.saleOrderId);
    },
    async createSaleOrderDetail(_: any, args: Record<string, any>) {
      return await createDetail(args.saleOrderDetailInput);
    },
    async updateSaleOrderDetail(_: any, args: Record<string, any>) {
      return await updateSaleOrderDetail(
        args.saleOrderDetailId,
        args.updateSaleOrderDetailInput
      );
    },
    async deleteProductToSaleOrderDetail(_: any, args: Record<string, any>) {
      return await deleteProductToOrder(args.saleOrderDetailId);
    },
    async addSerialToSaleOrderDetail(_: any, args: Record<string, any>) {
      return await addSerialToOrder(args.addSerialToSaleOrderDetailInput);
    },
    async deleteSerialToSaleOrderDetail(_: any, args: Record<string, any>) {
      return await deleteSerialToOrder(args.productSerialId);
    },
    async approveSaleOrder(_: any, args: Record<string, any>) {
      return await approve(args.saleOrderId);
    },
  },
};
