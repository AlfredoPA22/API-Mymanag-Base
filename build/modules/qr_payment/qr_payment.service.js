"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMesaDePagosWebhook = exports.generateDepositQrForLandingPayment = exports.generateDepositQrForClient = exports.generateDepositQr = void 0;
const mesaDePagosClient_1 = require("../../utils/mesaDePagosClient");
const qr_payment_model_1 = require("./qr_payment.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const company_model_1 = require("../company/company.model");
const saleOrder_service_1 = require("../sale_order/saleOrder.service");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const salePayment_service_1 = require("../sale_payment/salePayment.service");
const notification_service_1 = require("../notification/notification.service");
const socket_1 = require("../../socket");
const money_1 = require("../../utils/money");
const payment_landing_model_1 = require("../payment_landing/payment_landing.model");
const paymentLandingStatus_enum_1 = require("../../utils/enums/paymentLandingStatus.enum");
const payment_landing_activation_1 = require("../payment_landing/payment_landing.activation");
const sendAdminNotificationEmail_1 = require("../../utils/sendAdminNotificationEmail");
const landingPlanPrices_1 = require("../../utils/landingPlanPrices");
const requestQrForSaleOrder = async (companyId, saleOrder, input, owner) => {
    if (!input.amount || input.amount <= 0) {
        throw new Error("El monto debe ser mayor a 0");
    }
    if (!input.referenceId) {
        throw new Error("Falta la referencia del cobro");
    }
    if (input.type === "venta_contado" && saleOrder.is_paid) {
        throw new Error("Esta venta ya está pagada, no se puede generar otro QR.");
    }
    const company = await company_model_1.Company.findById(companyId);
    const companyCurrency = company?.currency || "Bs";
    let fiatAmountBob = input.amount;
    let exchangeRateUsed;
    if (companyCurrency === "$") {
        if (!company?.exchange_rate || company.exchange_rate <= 0) {
            throw new Error("Configura el tipo de cambio de la empresa en Ajustes antes de generar un QR.");
        }
        exchangeRateUsed = company.exchange_rate;
        fiatAmountBob = (0, money_1.round2)(input.amount * exchangeRateUsed);
    }
    const result = await (0, mesaDePagosClient_1.generateDepositQr)({
        fiatAmount: fiatAmountBob,
        fiatCurrency: "BOB",
        referenceId: input.referenceId,
        description: input.description,
    });
    await qr_payment_model_1.QrPayment.create({
        company: companyId,
        sale_order: input.saleOrderId,
        created_by: owner.created_by,
        client: owner.client,
        type: input.type,
        transactionId: result.transactionId,
        referenceId: result.referenceId,
        amount: input.amount,
        currency: companyCurrency,
        amount_bob: fiatAmountBob,
        exchange_rate: exchangeRateUsed,
        status: result.transactionStatus,
    });
    return result;
};
const generateDepositQr = async (companyId, userId, input) => {
    const saleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: input.saleOrderId,
        company: companyId,
    });
    if (!saleOrder) {
        throw new Error("Venta no encontrada");
    }
    // Solo para ventas creadas por staff: generar un QR antes de aprobar la
    // venta dejaría abierta la misma situación que arreglamos (Borrador
    // marcada como pagada si la aprobación automática falla al confirmarse
    // el pago). La tienda sí puede generar QR en Borrador — ahí el flujo es
    // al revés a propósito (se cobra primero, se aprueba después).
    if (saleOrder.status !== saleOrderStatus_enum_1.saleOrderStatus.APROBADO) {
        throw new Error("Solo se puede generar un QR de cobro para una venta ya aprobada.");
    }
    return requestQrForSaleOrder(companyId, saleOrder, input, { created_by: userId });
};
exports.generateDepositQr = generateDepositQr;
const generateDepositQrForClient = async (companyId, clientId, input) => {
    const saleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: input.saleOrderId,
        company: companyId,
        client: clientId,
    });
    if (!saleOrder) {
        throw new Error("Venta no encontrada");
    }
    return requestQrForSaleOrder(companyId, saleOrder, input, { client: clientId });
};
exports.generateDepositQrForClient = generateDepositQrForClient;
const generateDepositQrForLandingPayment = async (payment, description) => {
    const referenceId = `LANDING-${payment._id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const result = await (0, mesaDePagosClient_1.generateDepositQr)({
        fiatAmount: payment.amount,
        fiatCurrency: "BOB",
        referenceId,
        description: description || `Suscripción ${payment.system} — plan ${payment.plan}`,
    });
    await qr_payment_model_1.QrPayment.create({
        company: payment.company,
        payment_landing: payment._id,
        type: "landing_subscription",
        transactionId: result.transactionId,
        referenceId: result.referenceId,
        amount: payment.amount,
        currency: landingPlanPrices_1.LANDING_CURRENCY,
        status: result.transactionStatus,
    });
    return result;
};
exports.generateDepositQrForLandingPayment = generateDepositQrForLandingPayment;
const handleLandingQrConfirmed = async (qrPayment) => {
    const payment = await payment_landing_model_1.PaymentLanding.findById(qrPayment.payment_landing);
    if (!payment) {
        console.warn(`⚠️ QrPayment ${qrPayment.transactionId} sin PaymentLanding asociado`);
        return;
    }
    if (payment.status === paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED) {
        console.warn(`⚠️ Pago QR ${qrPayment.transactionId} confirmado pero PaymentLanding ${payment._id} ya estaba aprobado — posible doble pago.`);
        await (0, sendAdminNotificationEmail_1.sendAdminDoublePaymentAlertEmail)({
            paymentId: payment._id.toString(),
            transactionId: qrPayment.transactionId,
            amount: qrPayment.amount,
        });
        return;
    }
    const company = await company_model_1.Company.findById(payment.company);
    if (!company) {
        console.warn(`⚠️ Empresa no encontrada para PaymentLanding ${payment._id}`);
        return;
    }
    payment.paid_at = new Date();
    payment.status = paymentLandingStatus_enum_1.paymentLandingStatus.APPROVED;
    await payment.save();
    await (0, payment_landing_activation_1.applyPaymentLandingApproval)(payment, company);
    await (0, sendAdminNotificationEmail_1.sendAdminAutoActivatedEmail)({
        company_name: company.name,
        plan: payment.plan,
        system: payment.system || "MYMANAG",
        amount: payment.amount,
        currency: payment.currency,
        transactionId: qrPayment.transactionId,
    });
};
const handleMesaDePagosWebhook = async (input) => {
    const { status, transactionId, externalReference } = input;
    if (!transactionId && !externalReference) {
        console.warn("⚠️ Webhook de Mesa de Pagos sin transactionId ni externalReference, se ignora.");
        return;
    }
    const qrPayment = await qr_payment_model_1.QrPayment.findOne(transactionId ? { transactionId } : { referenceId: externalReference });
    if (!qrPayment) {
        console.warn(`⚠️ Webhook de Mesa de Pagos: no se encontró QrPayment (transactionId=${transactionId}, externalReference=${externalReference})`);
        return;
    }
    if (qrPayment.processed) {
        console.warn(`⚠️ Webhook de Mesa de Pagos ignorado: QrPayment ${qrPayment.transactionId} ya estaba procesado (status recibido: ${status}).`);
        return;
    }
    qrPayment.status = status;
    try {
        if (status !== "completed_transaction" || qrPayment.processed) {
            await qrPayment.save();
            return;
        }
        if (qrPayment.type === "landing_subscription") {
            await handleLandingQrConfirmed(qrPayment);
        }
        else {
            const saleOrder = await sale_order_model_1.SaleOrder.findById(qrPayment.sale_order);
            if (!saleOrder) {
                await qrPayment.save();
                return;
            }
            if (qrPayment.type === "abono_credito") {
                try {
                    await (0, salePayment_service_1.createPayment)(qrPayment.company, qrPayment.created_by, {
                        sale_order: saleOrder._id.toString(),
                        date: new Date(),
                        amount: qrPayment.amount,
                        payment_method: "QR",
                        note: `Pago automático vía QR — transacción ${qrPayment.transactionId}`,
                    });
                }
                catch (error) {
                    console.error(`⚠️ No se pudo registrar automáticamente el pago QR ${qrPayment.transactionId} para la venta ${saleOrder.code}:`, error);
                    await (0, notification_service_1.createNotification)(qrPayment.company, {
                        type: "qr_payment_error",
                        title: "Pago QR sin aplicar",
                        message: `Se confirmó un pago por QR de ${qrPayment.amount} ${qrPayment.currency} para la venta ${saleOrder.code}, pero no se pudo registrar automáticamente. Revísalo manualmente.`,
                        link: `/ventas/detalle/${saleOrder._id}`,
                    });
                }
            }
            else {
                if (saleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.BORRADOR) {
                    try {
                        await (0, saleOrder_service_1.approve)(qrPayment.company, saleOrder._id);
                    }
                    catch (error) {
                        console.error(`⚠️ No se pudo aprobar automáticamente la venta ${saleOrder.code} tras el pago QR:`, error);
                        await (0, notification_service_1.createNotification)(qrPayment.company, {
                            type: "qr_payment_error",
                            title: "Venta pagada por QR sin aprobar",
                            message: `Se confirmó el pago por QR de la venta ${saleOrder.code}, pero no se pudo aprobar automáticamente. Revísala manualmente.`,
                            link: `/ventas/editar-venta/${saleOrder._id}`,
                        });
                    }
                }
                await sale_order_model_1.SaleOrder.updateOne({ _id: saleOrder._id }, { $set: { is_paid: true } });
                await (0, notification_service_1.createNotification)(qrPayment.company, {
                    type: "qr_payment_completed",
                    title: "QR de cobro pagado",
                    message: `Se confirmó el pago por QR de la venta ${saleOrder.code} (${qrPayment.amount} ${qrPayment.currency}).`,
                    link: `/ventas/detalle/${saleOrder._id}`,
                });
            }
        }
        qrPayment.processed = true;
        await qrPayment.save();
    }
    finally {
        (0, socket_1.emitQrPaymentUpdate)(qrPayment.transactionId, status);
        if (qrPayment.sale_order) {
            (0, socket_1.emitSaleOrderPaymentUpdate)(qrPayment.sale_order.toString(), status);
        }
    }
};
exports.handleMesaDePagosWebhook = handleMesaDePagosWebhook;
