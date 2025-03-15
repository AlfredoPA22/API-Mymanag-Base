import { createProduct, deleteProduct, findAll, listProductSerialByPurchaseOrder, listProductSerialBySaleOrder, listProductSerialByProduct, update } from "./product.service";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";

export const productResolver = {
  Query: {
    async listProduct(): Promise<IProduct[]> {
      return await findAll();
    },
    
    async listProductSerialByPurchaseOrder(_: any, args: Record<string, any>): Promise<IProductSerial[]> {
      return await listProductSerialByPurchaseOrder(args.purchaseOrderDetailId);
    },

    async listProductSerialBySaleOrder(_: any, args: Record<string, any>): Promise<IProductSerial[]> {
      return await listProductSerialBySaleOrder(args.saleOrderDetailId);
    },

    async listProductSerialByProduct(_: any, args: Record<string, any>): Promise<IProductSerial[]> {
      return await listProductSerialByProduct(args.productId);
    },
  },
  Mutation: {
    async createProduct(_: any, args: Record<string, any>) {
      return await createProduct(args.productInput);
    },
    async deleteProduct(_: any, args: Record<string, any>) {
      return await deleteProduct(args.productId);
    },
    async updateProduct(_: any, args: Record<string, any>) {
      return await update(args.productId, args.updateProductInput);
    },
  },
};
