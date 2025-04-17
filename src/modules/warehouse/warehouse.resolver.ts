import { IWarehouse } from "../../interfaces/warehouse.interface";
import { hasPermission } from "../../utils/hasPermission";
import { create, deleteWarehouse, findAll, update } from "./warehouse.service";

export const warehouseResolver = {
  Query: {
    async listWarehouse(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IWarehouse[]> {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_WAREHOUSE",
        "LIST_AND_CREATE_PURCHASE",
        "LIST_AND_CREATE_SALE",
      ];
      await hasPermission(roleName, permission);

      return await findAll();
    },
  },
  Mutation: {
    async createWarehouse(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_WAREHOUSE",
        "LIST_AND_CREATE_PURCHASE",
        "LIST_AND_CREATE_SALE",
      ];
      await hasPermission(roleName, permission);

      return await create(args.warehouseInput);
    },
    async deleteWarehouse(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["DELETE_WAREHOUSE"];
      await hasPermission(roleName, permission);

      return await deleteWarehouse(args.warehouseId);
    },
    async updateWarehouse(_: any, args: Record<string, any>, context: any) {
      const roleName = context.user.role;
      const permission = ["UPDATE_WAREHOUSE"];
      await hasPermission(roleName, permission);

      return await update(args.warehouseId, args.updateWarehouseInput);
    },
  },
};
