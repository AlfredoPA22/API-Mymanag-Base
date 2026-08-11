"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLandingPlanPrice = exports.landingPlanPrices = exports.LANDING_CURRENCY = void 0;
const companyPlan_enum_1 = require("./enums/companyPlan.enum");
const systemType_enum_1 = require("./enums/systemType.enum");
exports.LANDING_CURRENCY = "Bs";
exports.landingPlanPrices = {
    [systemType_enum_1.systemType.MYMANAG]: {
        [companyPlan_enum_1.companyPlan.BASIC]: 299,
        [companyPlan_enum_1.companyPlan.PRO]: 599,
    },
    [systemType_enum_1.systemType.RESERVAYA]: {
        [companyPlan_enum_1.companyPlan.BASIC]: 199,
        [companyPlan_enum_1.companyPlan.PRO]: 399,
    },
};
const getLandingPlanPrice = (system, plan) => {
    const price = exports.landingPlanPrices[system]?.[plan];
    if (!price) {
        throw new Error(`No hay un precio configurado para ${system}/${plan}`);
    }
    return price;
};
exports.getLandingPlanPrice = getLandingPlanPrice;
