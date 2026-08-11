"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentLanding = exports.rejectPaymentLanding = exports.generateDepositQrForLanding = exports.approvePaymentLanding = exports.listPaymentLandingByCompany = exports.createPaymentLanding = void 0;
const mongoose_1 = require("mongoose");
const payment_landing_model_1 = require("./payment_landing.model");
const paymentLandingStatus_enum_1 = require("../../utils/enums/paymentLandingStatus.enum");
const paymentLandingMethod_enum_1 = require("../../utils/enums/paymentLandingMethod.enum");
const user_landing_model_1 = require("../user_landing/user_landing.model");
const company_model_1 = require("../company/company.model");
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const sendPaymentRejectEmail_1 = require("../../utils/sendPaymentRejectEmail");
const systemType_enum_1 = require("../../utils/enums/systemType.enum");
const companyPlan_enum_1 = require("../../utils/enums/companyPlan.enum");
const sendAdminNotificationEmail_1 = require("../../utils/sendAdminNotificationEmail");
const payment_landing_activation_1 = require("./payment_landing.activation");
const landingPlanPrices_1 = require("../../utils/landingPlanPrices");
const qr_payment_service_1 = require("../qr_payment/qr_payment.service");
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
    const company = await company_model_1.Company.findById(payment.company);
    if (!company)
        throw new Error("Empresa no encontrada");
    return (0, payment_landing_activation_1.applyPaymentLandingApproval)(payment, company);
};
exports.approvePaymentLanding = approvePaymentLanding;
const generateDepositQrForLanding = async (userId, companyId, plan, system = systemType_enum_1.systemType.MYMANAG, billing) => {
    const user = await user_landing_model_1.UserLanding.findById(userId);
    if (!user)
        throw new Error("Usuario no encontrado");
    const isAdmin = user.user_type === userLandingType_enum_1.userLandingType.ADMIN;
    const company = isAdmin
        ? await company_model_1.Company.findById(companyId)
        : await company_model_1.Company.findOne({ _id: companyId, created_by: userId });
    if (!company)
        throw new Error("Empresa no encontrada o no pertenece al usuario");
    if (plan !== companyPlan_enum_1.companyPlan.BASIC && plan !== companyPlan_enum_1.companyPlan.PRO) {
        throw new Error("Plan inválido para pago");
    }
    const price = (0, landingPlanPrices_1.getLandingPlanPrice)(system, plan);
    let payment = await payment_landing_model_1.PaymentLanding.findOne({
        company: companyId,
        system,
        status: paymentLandingStatus_enum_1.paymentLandingStatus.REVIEW,
    });
    if (payment && payment.method !== paymentLandingMethod_enum_1.paymentLandingMethod.QR) {
        throw new Error("Ya tienes un pago en revisión para esta empresa y sistema. Contacta a soporte.");
    }
    if (!payment) {
        payment = await payment_landing_model_1.PaymentLanding.create({
            company: companyId,
            system,
            plan,
            amount: price,
            currency: landingPlanPrices_1.LANDING_CURRENCY,
            method: paymentLandingMethod_enum_1.paymentLandingMethod.QR,
            status: paymentLandingStatus_enum_1.paymentLandingStatus.REVIEW,
            proof_url: "",
            paid_at: null,
            billing_info: {
                name: billing?.name || "",
                nit: billing?.nit || "",
                email: billing?.email || user.email,
            },
            created_by: userId,
        });
    }
    else if (payment.plan !== plan) {
        payment.plan = plan;
        payment.amount = price;
        await payment.save();
    }
    return (0, qr_payment_service_1.generateDepositQrForLandingPayment)(payment, `Suscripción ${system} — plan ${plan}`);
};
exports.generateDepositQrForLanding = generateDepositQrForLanding;
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
