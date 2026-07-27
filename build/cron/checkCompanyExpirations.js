"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCompanyExpirationCron = exports.checkCompanyExpirations = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const company_model_1 = require("../modules/company/company.model");
const companyPlan_enum_1 = require("../utils/enums/companyPlan.enum");
const companyStatus_enum_1 = require("../utils/enums/companyStatus.enum");
const systemType_enum_1 = require("../utils/enums/systemType.enum");
const sendExpirationWarningEmail_1 = require("../utils/sendExpirationWarningEmail");
const sendExpiredEmail_1 = require("../utils/sendExpiredEmail");
const user_landing_model_1 = require("../modules/user_landing/user_landing.model");
const notification_service_1 = require("../modules/notification/notification.service");
const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const checkCompanyExpirations = async () => {
    const today = new Date();
    const companies = await company_model_1.Company.find({});
    for (const company of companies) {
        try {
            const creator = await user_landing_model_1.UserLanding.findById(company.created_by);
            if (!creator)
                continue;
            // Check legacy top-level fields (MyManag backward compat)
            const legacyExpiration = company.plan === companyPlan_enum_1.companyPlan.FREE
                ? company.trial_expires_at
                : company.subscription_expires_at;
            if (legacyExpiration && company.status !== companyStatus_enum_1.companyStatus.EXPIRED) {
                const diffDays = Math.ceil((legacyExpiration.getTime() - today.getTime()) / MILLISECONDS_IN_DAY);
                if (diffDays <= 3 && diffDays >= 0 && !company.notified_before_expiration) {
                    console.log(`📨 Enviando aviso de expiración a ${company.name} (MyManag)`);
                    await (0, sendExpirationWarningEmail_1.sendExpirationWarningEmail)(creator.email, company.name, legacyExpiration);
                    company.notified_before_expiration = true;
                    await company.save();
                    await (0, notification_service_1.createNotification)(company._id, {
                        type: "payment_expiring",
                        title: "Tu plan está por vencer",
                        message: `Tu plan vence el ${legacyExpiration.toLocaleDateString("es-BO")}. Realiza el pago para evitar la interrupción del servicio.`,
                        link: "/configuracion",
                    });
                }
                if (legacyExpiration <= today) {
                    company.status = companyStatus_enum_1.companyStatus.EXPIRED;
                    await company.save();
                    console.log(`❌ Empresa expirada (MyManag): ${company.name}`);
                    await (0, sendExpiredEmail_1.sendExpiredEmail)(creator.email, company.name);
                    await (0, notification_service_1.createNotification)(company._id, {
                        type: "payment_expiring",
                        title: "Plan expirado",
                        message: "Tu plan ha expirado. Registra el pago para reactivar tu cuenta.",
                        link: "/configuracion",
                    });
                }
            }
            // Check subscriptions (multi-system)
            const subscriptions = company.subscriptions;
            if (!subscriptions || subscriptions.length === 0)
                continue;
            let modified = false;
            for (const sub of subscriptions) {
                // Skip MyManag - already handled by legacy fields above
                if (sub.system === systemType_enum_1.systemType.MYMANAG)
                    continue;
                if (sub.status === companyStatus_enum_1.companyStatus.EXPIRED)
                    continue;
                const expirationDate = sub.plan === companyPlan_enum_1.companyPlan.FREE ? sub.trial_expires_at : sub.subscription_expires_at;
                if (!expirationDate)
                    continue;
                const diffDays = Math.ceil((new Date(expirationDate).getTime() - today.getTime()) / MILLISECONDS_IN_DAY);
                if (diffDays <= 3 && diffDays >= 0 && !sub.notified_before_expiration) {
                    console.log(`📨 Enviando aviso de expiración a ${company.name} (${sub.system})`);
                    await (0, sendExpirationWarningEmail_1.sendExpirationWarningEmail)(creator.email, company.name, new Date(expirationDate));
                    sub.notified_before_expiration = true;
                    modified = true;
                }
                if (new Date(expirationDate) <= today) {
                    sub.status = companyStatus_enum_1.companyStatus.EXPIRED;
                    modified = true;
                    console.log(`❌ Suscripción expirada (${sub.system}): ${company.name}`);
                    await (0, sendExpiredEmail_1.sendExpiredEmail)(creator.email, company.name);
                }
            }
            if (modified) {
                company.markModified("subscriptions");
                await company.save();
            }
        }
        catch (error) {
            console.error(`❌ Error procesando expiración para empresa ${company.name}:`, error instanceof Error ? error.message : String(error));
        }
    }
    console.log("✅ Verificación de expiraciones completada");
};
exports.checkCompanyExpirations = checkCompanyExpirations;
// Ejecutar todos los días a la 01:00 am
const initCompanyExpirationCron = () => {
    node_cron_1.default.schedule("00 1 * * *", async () => {
        console.log("🕐 Ejecutando verificación de expiraciones...");
        await (0, exports.checkCompanyExpirations)();
    }, {
        timezone: "America/La_Paz",
    });
};
exports.initCompanyExpirationCron = initCompanyExpirationCron;
