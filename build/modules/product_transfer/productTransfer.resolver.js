"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTransferResolver = void 0;
const ability_1 = require("../../utils/ability");
const productTransfer_service_1 = require("./productTransfer.service");
exports.ProductTransferResolver = {
    Query: {
        async listProductTransfer(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "Transfer");
            return await (0, productTransfer_service_1.findAll)(context.user.companyId, context.user.id);
        },
        async findProductTransfer(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["read", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.findProductTransfer)(context.user.companyId, args.transferId);
        },
        async listProductTransferDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["list", "Transfer"],
                ["read", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.findDetail)(context.user.companyId, args.transferId);
        },
    },
    Mutation: {
        async createProductTransfer(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "Transfer");
            return await (0, productTransfer_service_1.create)(context.user.companyId, context.user.id, args.productTransferInput);
        },
        async createProductTransferDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.createDetail)(context.user.companyId, args.productTransferDetailInput);
        },
        async addSerialToTransferDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.addSerialToTransferDetail)(context.user.companyId, args.addSerialToTransferDetailInput);
        },
        async removeSerialFromTransferDetail(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.removeSerialFromTransferDetail)(context.user.companyId, args.transferDetailId, args.serial);
        },
        async deleteProductFromTransfer(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.deleteProductFromTransfer)(context.user.companyId, args.transferDetailId);
        },
        async deleteProductTransfer(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "delete", "Transfer");
            return await (0, productTransfer_service_1.deleteProductTransfer)(context.user.companyId, args.transferId);
        },
        async approveProductTransfer(_, args, context) {
            (0, ability_1.checkAnyAbility)(context.ability, [
                ["create", "Transfer"],
                ["update", "Transfer"],
            ]);
            return await (0, productTransfer_service_1.approveProductTransfer)(context.user.companyId, args.transferId);
        },
    },
};
