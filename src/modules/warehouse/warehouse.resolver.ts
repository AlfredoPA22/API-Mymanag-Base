import { IWarehouse } from "../../interfaces/warehouse.interface";
import { create, deleteWarehouse, findAll, update } from "./warehouse.service";

export const warehouseResolver = {
  Query: {
    async listWarehouse(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IWarehouse[]> {
    //   const roleName = context.user.role;
    //   const permission = [
    //     "LIST_AND_CREATE_CATEGORY",
    //     "LIST_AND_CREATE_PRODUCT",
    //   ];
    //   await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createWarehouse(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["LIST_AND_CREATE_CATEGORY"];
    //   await hasPermission(roleName, permission);

      return await create(args.warehouseInput);
    },
    async deleteWarehouse(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["DELETE_CATEGORY"];
    //   await hasPermission(roleName, permission);

      return await deleteWarehouse(args.warehouseId);
    },
    async updateWarehouse(_: any, args: Record<string, any>, context: any) {
    //   const roleName = context.user.role;
    //   const permission = ["UPDATE_CATEGORY"];
    //   await hasPermission(roleName, permission);

      return await update(args.warehouseId, args.updateWarehouseInput);
    },
  },
};
