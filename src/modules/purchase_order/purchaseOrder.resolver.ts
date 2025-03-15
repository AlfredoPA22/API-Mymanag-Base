import { addSerialToOrder, approve, create, createDetail, deleteProductToOrder, deletePurchaseOrder, deleteSerialToOrder, findAll, findDetail, findPurchaseOrder,findPurchaseOrderToPDF, reportPurhaseOrderByYear, updatePurchaseOrderDetail } from "./purchaseOrder.service";
import { IPurchaseOrder, IPurchaseOrderByYear, IPurchaseOrderToPDF } from "../../interfaces/purchaseOrder.interface";
import { IPurchaseOrderDetail } from "../../interfaces/purchaseOrderDetail.interface";

export const purchaseOrderResolver = {
  Query: {
    async listPurchaseOrder(): Promise<IPurchaseOrder[]> {
      return await findAll();
    },
    async listPurchaseOrderDetail(_: any, args: Record<string, any>): Promise<IPurchaseOrderDetail[]> {
      return await findDetail(args.purchaseOrderId);
    },
    async findPurchaseOrder(_: any, args: Record<string, any>): Promise<IPurchaseOrder> {
      return await findPurchaseOrder(args.purchaseOrderId);
    },
    async findPurchaseOrderToPDF(_: any, args: Record<string, any>): Promise<IPurchaseOrderToPDF> {
      return await findPurchaseOrderToPDF(args.purchaseOrderId);
    },
    async reportPurchaseOrderByYear(): Promise<IPurchaseOrderByYear[]> {
      return await reportPurhaseOrderByYear();
    },
  },
  Mutation: {
    async createPurchaseOrder(_: any, args: Record<string, any>) {
      return await create(args.purchaseOrderInput);
    },
    async createPurchaseOrderDetail(_: any, args: Record<string, any>) {
      return await createDetail(args.purchaseOrderDetailInput);
    },
    async updatePurchaseOrderDetail(_: any, args: Record<string, any>) {
      return await updatePurchaseOrderDetail(args.purchaseOrderDetailId,args.updatePurchaseOrderDetailInput);
    },
    async addSerialToPurchaseOrderDetail(_: any, args: Record<string, any>) {
      return await addSerialToOrder(args.addSerialToPurchaseOrderDetailInput);
    },
    async deleteSerialToPurchaseOrderDetail(_: any, args: Record<string, any>) {
      return await deleteSerialToOrder(args.productSerialId);
    },
    async deleteProductToPurchaseOrderDetail(_: any, args: Record<string, any>) {
      return await deleteProductToOrder(args.purchaseOrderDetailId);
    },
    async deletePurchaseOrder(_: any, args: Record<string, any>) {
      return await deletePurchaseOrder(args.purchaseOrderId);
    },
    async approvePurchaseOrder(_: any, args: Record<string, any>) {
      return await approve(args.purchaseOrderId);
    },
  },
};
