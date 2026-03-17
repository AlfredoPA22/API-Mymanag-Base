import { IProductTransfer } from "../../interfaces/productTransfer.interface";
import { IProductTransferDetail } from "../../interfaces/productTransferDetail.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import {
  addSerialToTransferDetail,
  approveProductTransfer,
  create,
  createDetail,
  deleteProductFromTransfer,
  deleteProductTransfer,
  findAll,
  findDetail,
  findProductTransfer,
  removeSerialFromTransferDetail,
} from "./productTransfer.service";

export const ProductTransferResolver = {
  Query: {
    async listProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductTransfer[]> {
      checkAbility(context.ability, "list", "Transfer");
      return await findAll(context.user.companyId, context.user.id);
    },
    async findProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductTransfer> {
      checkAnyAbility(context.ability, [
        ["read", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await findProductTransfer(
        context.user.companyId,
        args.transferId
      );
    },
    async listProductTransferDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductTransferDetail[]> {
      checkAnyAbility(context.ability, [
        ["list", "Transfer"],
        ["read", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await findDetail(context.user.companyId, args.transferId);
    },
  },
  Mutation: {
    async createProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAbility(context.ability, "create", "Transfer");
      return await create(
        context.user.companyId,
        context.user.id,
        args.productTransferInput
      );
    },
    async createProductTransferDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await createDetail(
        context.user.companyId,
        args.productTransferDetailInput
      );
    },
    async addSerialToTransferDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await addSerialToTransferDetail(
        context.user.companyId,
        args.addSerialToTransferDetailInput
      );
    },
    async removeSerialFromTransferDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await removeSerialFromTransferDetail(
        context.user.companyId,
        args.transferDetailId,
        args.serial
      );
    },
    async deleteProductFromTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await deleteProductFromTransfer(
        context.user.companyId,
        args.transferDetailId
      );
    },
    async deleteProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAbility(context.ability, "delete", "Transfer");
      return await deleteProductTransfer(
        context.user.companyId,
        args.transferId
      );
    },
    async approveProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductTransfer> {
      checkAnyAbility(context.ability, [
        ["create", "Transfer"],
        ["update", "Transfer"],
      ]);
      return await approveProductTransfer(
        context.user.companyId,
        args.transferId
      );
    },
  },
};
