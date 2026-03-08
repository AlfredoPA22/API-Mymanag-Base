import { IProductTransfer } from "../../interfaces/productTransfer.interface";
import { IProductTransferDetail } from "../../interfaces/productTransferDetail.interface";
import { hasPermission } from "../../utils/hasPermission";
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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await findAll(context.user.companyId, context.user.id);
    },

    async findProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IProductTransfer> {
      const roleName = context.user.role;
      const permission = ["DETAIL_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = [
        "LIST_AND_CREATE_TRANSFER",
        "DETAIL_TRANSFER",
        "EDIT_TRANSFER",
      ];
      await hasPermission(roleName, permission, context.user.companyId);

      return await findDetail(context.user.companyId, args.transferId);
    },
  },

  Mutation: {
    async createProductTransfer(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["DELETE_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

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
      const roleName = context.user.role;
      const permission = ["LIST_AND_CREATE_TRANSFER", "EDIT_TRANSFER"];
      await hasPermission(roleName, permission, context.user.companyId);

      return await approveProductTransfer(
        context.user.companyId,
        args.transferId
      );
    },
  },
};
