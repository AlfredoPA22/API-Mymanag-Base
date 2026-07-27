"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyResolver = void 0;
const company_service_1 = require("./company.service");
const ability_1 = require("../../utils/ability");
exports.companyResolver = {
    Query: {
        async listCompany(_, args, context) {
            return await (0, company_service_1.findAll)(context.user.id);
        },
        async listCompanyAdmin(_, args, context) {
            return await (0, company_service_1.findAllAdmin)(context.user.id);
        },
        async detailCompany(_, args, context) {
            return await (0, company_service_1.detailCompany)(context.user.companyId);
        },
        async companyDeletionReport(_, args, context) {
            return await (0, company_service_1.getCompanyDeletionReport)(context.user.id, args.companyId);
        },
        async companyBackup(_, args, context) {
            return await (0, company_service_1.generateCompanyBackup)(context.user.id, args.companyId);
        },
    },
    Mutation: {
        async createCompany(_, args, context) {
            return await (0, company_service_1.create)(context.user.id, args.companyInput);
        },
        async updateCompany(_, args, context) {
            (0, ability_1.checkAbility)(context.ability, "update", "Company");
            return await (0, company_service_1.update)(context.user.companyId, args.updateCompanyInput);
        },
        async adjustSubscription(_, args, context) {
            return await (0, company_service_1.adjustSubscription)(context.user.id, args.input);
        },
        async deleteCompanyPermanently(_, args, context) {
            return await (0, company_service_1.deleteCompanyPermanently)(context.user.id, args.companyId, args.confirmationText);
        },
    },
};
