import { IWarehouse } from "../../interfaces/warehouse.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import { create, deleteWarehouse, findAll, update } from "./warehouse.service";

export const warehouseResolver = {
  Query: {
    async listWarehouse(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IWarehouse[]> {
      checkAnyAbility(context.ability, [
        ["list", "Warehouse"],
        ["list", "Purchase"],
        ["list", "Sale"],
      ]);
      return await findAll(context.user.companyId);
    },
  },
  Mutation: {
    async createWarehouse(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Warehouse"],
        ["create", "Purchase"],
        ["create", "Sale"],
      ]);
      return await create(context.user.companyId, args.warehouseInput);
    },
    async deleteWarehouse(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Warehouse");
      return await deleteWarehouse(context.user.companyId, args.warehouseId);
    },
    async updateWarehouse(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "update", "Warehouse");
      return await update(
        context.user.companyId,
        args.warehouseId,
        args.updateWarehouseInput
      );
    },
  },
};
