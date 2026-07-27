"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyPlanLimits = void 0;
const companyPlan_enum_1 = require("./enums/companyPlan.enum");
exports.companyPlanLimits = {
    [companyPlan_enum_1.companyPlan.FREE]: {
        maxBrand: 3,
        maxCategory: 3,
        maxClient: 3,
        maxProduct: 10,
        maxProvider: 3,
        maxPurchaseOrder: 3,
        maxRole: 1,
        maxSaleOrder: 3,
        maxSalePayment: 3,
        maxUser: 1,
        maxWarehouse: 1,
        hasStore: false,
    },
    [companyPlan_enum_1.companyPlan.BASIC]: {
        maxBrand: 50,
        maxCategory: 50,
        maxClient: 50,
        maxProduct: 200,
        maxProvider: 50,
        maxPurchaseOrder: 100,
        maxRole: 3,
        maxSaleOrder: 100,
        maxSalePayment: 100,
        maxUser: 3,
        maxWarehouse: 3,
        hasStore: false,
    },
    [companyPlan_enum_1.companyPlan.PRO]: {
        maxBrand: Infinity,
        maxCategory: Infinity,
        maxClient: Infinity,
        maxProduct: Infinity,
        maxProvider: Infinity,
        maxPurchaseOrder: Infinity,
        maxRole: Infinity,
        maxSaleOrder: Infinity,
        maxSalePayment: Infinity,
        maxUser: Infinity,
        maxWarehouse: Infinity,
        hasStore: true,
    },
};
