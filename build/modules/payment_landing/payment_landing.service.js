"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentLanding = exports.rejectPaymentLanding = exports.approvePaymentLanding = exports.listPaymentLandingByCompany = exports.createPaymentLanding = void 0;
const mongoose_1 = require("mongoose");
const payment_landing_model_1 = require("./payment_landing.model");
const paymentLandingStatus_enum_1 = require("../../utils/enums/paymentLandingStatus.enum");
const user_landing_model_1 = require("../user_landing/user_landing.model");
const company_model_1 = require("../company/company.model");
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const sendPaymentApproveEmail_1 = require("../../utils/sendPaymentApproveEmail");
const sendPaymentRejectEmail_1 = require("../../utils/sendPaymentRejectEmail");
const companyStatus_enum_1 = require("../../utils/enums/companyStatus.enum");
const systemType_enum_1 = require("../../utils/enums/systemType.enum");
const planLimits_1 = require("../../utils/planLimits");
const date_fns_1 = require("date-fns");
const company_service_1 = require("../company/company.service");
const user_model_1 = require("../user/user.model");
const sendAdminNotificationEmail_1 = require("../../utils/sendAdminNotificationEmail");
const createPaymentLanding = async (userId, paymentLandingInput) => {
    if (!paymentLandingInput.proof_url) {
        throw new Error("Debe subir el comprobante de pago");
    }
    const system = paymentLandingInput.system || systemType_enum_1.systemType.MYMANAG;
    const existing = await payment_landing_model_1.PaymentLanding.findOne({
        company: paymentLandingInput.company,
        system,
        status: paymentLandingStatus_enum_1.paymentLandingStatus.REVIEW,
    });
    if (existing) {
        throw new Error("Ya existe un pago en revision para esta empresa y sistema");
    }
    const newPayment = await payment_landing_model_1.PaymentLanding.create({
        company: paymentLandingInput.company,
        system,
        plan: paymentLandingInput.plan,
        amount: paymentLandingInput.amount,
        currency: paymentLandingInput.currency,
        method: paymentLandingInput.method,
        proof_url: paymentLandingInput.proof_url || "",
        paid_at: new Date(),
        billing_info: {
            name: paymentLandingInput.billing_name || "",
            nit: paymentLandingInput.billing_nit || "",
            email: paymentLandingInput.billing_email || "",
        },
        created_by: userId,
    });
    const populatedPayment = await payment_landing_model_1.PaymentLanding.findById(newPayment._id).populate("company");
    // Notificar al administrador de Inventasys
    const companyDoc = await company_model_1.Company.findById(paymentLandingInput.company);
    const userDoc = await user_landing_model_1.UserLanding.findById(userId);
    if (companyDoc && userDoc) {
        await (0, sendAdminNotificationEmail_1.sendAdminNewPaymentEmail)({
            company_name: companyDoc.name,
            user_name: userDoc.fullName,
            user_email: userDoc.email,
            plan: paymentLandingInput.plan,
            system: paymentLandingInput.system || systemType_enum_1.systemType.MYMANAG,
            amount: paymentLandingInput.amount,
            currency: paymentLandingInput.currency,
            method: paymentLandingInput.method,
        });
    }
    return populatedPayment;
};
exports.createPaymentLanding = createPaymentLanding;
const listPaymentLandingByCompany = async (userId, companyId) => {
    const foundUser = await user_landing_model_1.UserLanding.findById(userId);
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const isAdmin = foundUser.user_type === userLandingType_enum_1.userLandingType.ADMIN;
    if (!isAdmin) {
        const company = await company_model_1.Company.findOne({
            _id: companyId,
            created_by: userId,
        });
        if (!company) {
            throw new Error("Empresa no encontrada o no pertenece al usuario");
        }
    }
    const listPaymentLanding = await payment_landing_model_1.PaymentLanding.find({
        company: companyId,
    })
        .populate("company")
        .lean();
    return listPaymentLanding;
};
exports.listPaymentLandingByCompany = listPaymentLandingByCompany;
const approvePaymentLanding = async (userId, paymentId) => {
    const user = await user_landing_model_1.UserLanding.findById(userId);
    if (!user)
        throw new Error("Usuario no encontrado");
    if (user.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("No tienes permisos para aprobar pagos");
    }
    const payment = await payment_landing_model_1.PaymentLanding.findById(paymentId);
    if (!payment)
        throw new Error("Pago no encontrado");
    if (payment.status === paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED) {
        throw new Error("Este pago ya fue aprobado");
    }
    const paymentCreator = await user_landing_model_1.UserLanding.findById(payment.created_by);
    if (!paymentCreator)
        throw new Error("Usuario creador del pago no encontrado");
    const company = await company_model_1.Company.findById(payment.company._id);
    if (!company)
        throw new Error("Empresa no encontrada");
    const companyCreator = await user_landing_model_1.UserLanding.findById(company.created_by);
    if (!companyCreator)
        throw new Error("Usuario creador de la empresa no encontrado");
    payment.status = paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED;
    await payment.save();
    const paymentSystem = payment.system || systemType_enum_1.systemType.MYMANAG;
    const isMyManag = paymentSystem === systemType_enum_1.systemType.MYMANAG;
    // Find or create the subscription for this system
    const subIndex = company.subscriptions.findIndex((s) => s.system === paymentSystem);
    const today = new Date();
    // Determinar si es la primera activación de esta suscripción.
    // Al registrar la empresa con plan de pago ya se crea la suscripción en PENDING,
    // por eso no podemos usar subIndex === -1. En cambio verificamos:
    // - MyManag: si aún no existe ningún usuario en la empresa
    // - ReservaYa: si la suscripción actual está en PENDING (nunca fue activada)
    const existingSubStatus = subIndex !== -1
        ? company.subscriptions[subIndex].status
        : null;
    const existingMyManagUser = isMyManag
        ? await user_model_1.User.findOne({ company: company._id })
        : null;
    const isFirstActivation = subIndex === -1 ||
        (isMyManag && !existingMyManagUser) ||
        (!isMyManag && existingSubStatus === companyStatus_enum_1.companyStatus.PENDING);
    if (subIndex === -1) {
        // La suscripción no existía en el array — agregarla
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
        // La suscripción ya existía (puede ser PENDING primera vez, o ACTIVE/EXPIRED para renovación)
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
    // Si es la primera activación: crear usuario y enviar credenciales
    if (isFirstActivation) {
        if (isMyManag) {
            await (0, company_service_1.activateFirstMyManagUser)(company, companyCreator.email);
        }
        if (paymentSystem === systemType_enum_1.systemType.RESERVAYA) {
            await (0, company_service_1.activateFirstReservaYaUser)(company, companyCreator.email);
        }
    }
    // Sync legacy top-level fields for MyManag backward compatibility
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
        // Si el plan aprobado no incluye tienda online, se apaga de verdad —
        // igual criterio que en adjustSubscription (no se reactiva sola al
        // volver a subir de plan, hay que reactivarla a mano).
        if (!planLimits_1.companyPlanLimits[payment.plan]?.hasStore) {
            company.store_enabled = false;
        }
    }
    company.markModified("subscriptions");
    await company.save();
    const updatePayment = await payment_landing_model_1.PaymentLanding.findById(paymentId)
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
exports.approvePaymentLanding = approvePaymentLanding;
const rejectPaymentLanding = async (userId, paymentId) => {
    const user = await user_landing_model_1.UserLanding.findById(userId);
    if (!user)
        throw new Error("Usuario no encontrado");
    if (user.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("No tienes permisos para rechazar pagos");
    }
    const payment = await payment_landing_model_1.PaymentLanding.findById(paymentId);
    if (!payment)
        throw new Error("Pago no encontrado");
    if (payment.status === paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED) {
        throw new Error("No se puede rechazar un pago ya aprobado");
    }
    const paymentCreator = await user_landing_model_1.UserLanding.findById(payment.created_by);
    if (!paymentCreator)
        throw new Error("Usuario creador del pago no encontrado");
    payment.status = paymentLandingStatus_enum_1.paymentLandingStatus.REJECTED;
    await payment.save();
    const updatePayment = await payment_landing_model_1.PaymentLanding.findById(paymentId)
        .populate("company")
        .lean();
    if (!updatePayment)
        throw new Error("Pago no encontrado");
    try {
        await (0, sendPaymentRejectEmail_1.sendPaymentRejectedEmail)({
            to: paymentCreator.email,
            user_name: paymentCreator.fullName,
            payment: updatePayment,
            reason: "El pago no fue recibido o el comprobante es inválido",
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo enviar correo de rechazo de pago:", error);
    }
    return updatePayment;
};
exports.rejectPaymentLanding = rejectPaymentLanding;
const updatePaymentLanding = async (userId, paymentId, proof_url) => {
    const payment = await payment_landing_model_1.PaymentLanding.findById(paymentId);
    if (!payment)
        throw new Error("Pago no encontrado");
    if (!payment.created_by.equals(new mongoose_1.Types.ObjectId(`${userId}`))) {
        throw new Error("No tienes permisos para modificar este pago");
    }
    if (payment.status !== paymentLandingStatus_enum_1.paymentLandingStatus.REJECTED &&
        payment.status !== paymentLandingStatus_enum_1.paymentLandingStatus.REVIEW) {
        throw new Error("Solo puedes actualizar pagos rechazados o pendientes");
    }
    const lastPayment = await payment_landing_model_1.PaymentLanding.findOne({
        company: payment.company,
        system: payment.system,
    })
        .sort({ paid_at: -1, createdAt: -1 })
        .limit(1);
    if (!lastPayment)
        throw new Error("No se pudo determinar el último pago realizado.");
    if (lastPayment._id.toString() !== payment._id.toString()) {
        throw new Error("Solo puedes actualizar el comprobante del último pago realizado.");
    }
    payment.proof_url = proof_url;
    payment.status = paymentLandingStatus_enum_1.paymentLandingStatus.REVIEW;
    await payment.save();
    const updatedPayment = await payment_landing_model_1.PaymentLanding.findById(paymentId)
        .populate("company")
        .lean();
    if (!updatedPayment)
        throw new Error("Pago actualizado no encontrado");
    return updatedPayment;
};
exports.updatePaymentLanding = updatePaymentLanding;
