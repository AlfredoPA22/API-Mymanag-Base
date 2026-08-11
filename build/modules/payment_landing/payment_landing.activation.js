"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPaymentLandingApproval = void 0;
const date_fns_1 = require("date-fns");
const payment_landing_model_1 = require("./payment_landing.model");
const paymentLandingStatus_enum_1 = require("../../utils/enums/paymentLandingStatus.enum");
const user_landing_model_1 = require("../user_landing/user_landing.model");
const companyStatus_enum_1 = require("../../utils/enums/companyStatus.enum");
const systemType_enum_1 = require("../../utils/enums/systemType.enum");
const planLimits_1 = require("../../utils/planLimits");
const company_service_1 = require("../company/company.service");
const user_model_1 = require("../user/user.model");
const sendPaymentApproveEmail_1 = require("../../utils/sendPaymentApproveEmail");
/**
 * Aplica la activación/renovación de suscripción para un pago ya confirmado.
 * Compartida entre la aprobación manual (admin) y la confirmación automática
 * por webhook — no depende de qr_payment.service.ts ni de payment_landing.service.ts
 * para evitar un import circular entre ambos.
 */
const applyPaymentLandingApproval = async (payment, company) => {
    const paymentCreator = await user_landing_model_1.UserLanding.findById(payment.created_by);
    if (!paymentCreator)
        throw new Error("Usuario creador del pago no encontrado");
    const companyCreator = await user_landing_model_1.UserLanding.findById(company.created_by);
    if (!companyCreator)
        throw new Error("Usuario creador de la empresa no encontrado");
    payment.status = paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED;
    if (!payment.paid_at)
        payment.paid_at = new Date();
    await payment.save();
    const paymentSystem = payment.system || systemType_enum_1.systemType.MYMANAG;
    const isMyManag = paymentSystem === systemType_enum_1.systemType.MYMANAG;
    const subIndex = company.subscriptions.findIndex((s) => s.system === paymentSystem);
    const today = new Date();
    const existingSubStatus = subIndex !== -1 ? company.subscriptions[subIndex].status : null;
    const existingMyManagUser = isMyManag
        ? await user_model_1.User.findOne({ company: company._id })
        : null;
    const isFirstActivation = subIndex === -1 ||
        (isMyManag && !existingMyManagUser) ||
        (!isMyManag && existingSubStatus === companyStatus_enum_1.companyStatus.PENDING);
    if (subIndex === -1) {
        company.subscriptions.push({
            system: paymentSystem,
            plan: payment.plan,
            status: companyStatus_enum_1.companyStatus.ACTIVE,
            trial_expires_at: null,
            subscription_expires_at: (0, date_fns_1.addMonths)(today, 1),
            notified_before_expiration: false,
        });
    }
    else {
        const sub = company.subscriptions[subIndex];
        const baseDate = !isFirstActivation && sub.subscription_expires_at && sub.subscription_expires_at > today
            ? sub.subscription_expires_at
            : today;
        company.subscriptions[subIndex] = {
            system: paymentSystem,
            plan: payment.plan,
            status: companyStatus_enum_1.companyStatus.ACTIVE,
            trial_expires_at: null,
            subscription_expires_at: (0, date_fns_1.addMonths)(baseDate, 1),
            notified_before_expiration: false,
        };
    }
    if (isFirstActivation) {
        if (isMyManag) {
            await (0, company_service_1.activateFirstMyManagUser)(company, companyCreator.email);
        }
        if (paymentSystem === systemType_enum_1.systemType.RESERVAYA) {
            await (0, company_service_1.activateFirstReservaYaUser)(company, companyCreator.email);
        }
    }
    if (isMyManag) {
        const isFirstTime = company.status === companyStatus_enum_1.companyStatus.PENDING;
        if (isFirstTime) {
            company.status = companyStatus_enum_1.companyStatus.ACTIVE;
            company.plan = payment.plan;
            company.trial_expires_at = null;
            company.subscription_expires_at = (0, date_fns_1.addMonths)(today, 1);
            company.notified_before_expiration = false;
        }
        else {
            const baseDate = company.subscription_expires_at && company.subscription_expires_at > today
                ? company.subscription_expires_at
                : today;
            company.status = companyStatus_enum_1.companyStatus.ACTIVE;
            company.plan = payment.plan;
            company.trial_expires_at = null;
            company.subscription_expires_at = (0, date_fns_1.addMonths)(baseDate, 1);
            company.notified_before_expiration = false;
        }
        if (!planLimits_1.companyPlanLimits[payment.plan]?.hasStore) {
            company.store_enabled = false;
        }
    }
    company.markModified("subscriptions");
    await company.save();
    const updatePayment = await payment_landing_model_1.PaymentLanding.findById(payment._id)
        .populate("company")
        .lean();
    if (!updatePayment)
        throw new Error("Pago no encontrado");
    try {
        await (0, sendPaymentApproveEmail_1.sendPaymentApproveEmail)({
            to: paymentCreator.email,
            user_name: paymentCreator.fullName,
            payment: updatePayment,
            isFirstActivation,
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo enviar correo de aprobación:", error);
    }
    return updatePayment;
};
exports.applyPaymentLandingApproval = applyPaymentLandingApproval;
