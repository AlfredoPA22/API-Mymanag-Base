"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashRegisterResolver = void 0;
const ability_1 = require("../../utils/ability");
const cashRegister_service_1 = require("./cashRegister.service");
exports.cashRegisterResolver = {
    Query: {
        async findCurrentCashRegister(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "read", "CashRegister");
            return await (0, cashRegister_service_1.findCurrentCashRegister)(context.user.companyId);
        },
        async listCashRegister(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "list", "CashRegister");
            return await (0, cashRegister_service_1.findAll)(context.user.companyId);
        },
    },
    Mutation: {
        async openCashRegister(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "create", "CashRegister");
            return await (0, cashRegister_service_1.openCashRegister)(context.user.companyId, context.user.id, args.openCashRegisterInput);
        },
        async closeCashRegister(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "CashRegister");
            return await (0, cashRegister_service_1.closeCashRegister)(context.user.companyId, context.user.id, args.cashRegisterId, args.closeCashRegisterInput);
        },
        async addCashMovement(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "CashRegister");
            return await (0, cashRegister_service_1.addCashMovement)(context.user.companyId, context.user.id, args.cashRegisterId, args.addCashMovementInput);
        },
    },
};
