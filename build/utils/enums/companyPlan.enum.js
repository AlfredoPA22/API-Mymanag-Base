"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LABELS = exports.companyPlan = void 0;
var companyPlan;
(function (companyPlan) {
    companyPlan["FREE"] = "prueba";
    companyPlan["BASIC"] = "basico";
    companyPlan["PRO"] = "profesional";
})(companyPlan || (exports.companyPlan = companyPlan = {}));
exports.PLAN_LABELS = {
    [companyPlan.FREE]: "Prueba",
    [companyPlan.BASIC]: "Básico",
    [companyPlan.PRO]: "Profesional",
};
