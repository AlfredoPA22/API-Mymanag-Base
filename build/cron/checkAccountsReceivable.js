"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAccountsReceivableCron = exports.checkAccountsReceivable = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const company_model_1 = require("../modules/company/company.model");
const sale_order_model_1 = require("../modules/sale_order/sale_order.model");
const companyStatus_enum_1 = require("../utils/enums/companyStatus.enum");
const saleOrderPaymentMethod_1 = require("../utils/enums/saleOrderPaymentMethod");
const saleOrderStatus_enum_1 = require("../utils/enums/saleOrderStatus.enum");
const sendAccountsReceivableReminderEmail_1 = require("../utils/sendAccountsReceivableReminderEmail");
const notification_service_1 = require("../modules/notification/notification.service");
const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const FIRST_REMINDER_AFTER_DAYS = 7;
const REMIND_AGAIN_AFTER_DAYS = 7;
const checkAccountsReceivable = async () => {
    const now = new Date();
    const companies = await company_model_1.Company.find({ status: companyStatus_enum_1.companyStatus.ACTIVE }).lean();
    let totalRecordatorios = 0;
    for (const company of companies) {
        try {
            const orders = await sale_order_model_1.SaleOrder.find({
                company: company._id,
                status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
                payment_method: saleOrderPaymentMethod_1.paymentMethod.CREDITO,
                is_paid: false,
            }).populate("client");
            for (const order of orders) {
                try {
                    const orderAgeDays = (now.getTime() - order.date.getTime()) / MILLISECONDS_IN_DAY;
                    if (orderAgeDays < FIRST_REMINDER_AFTER_DAYS)
                        continue;
                    const lastReminder = order.payment_reminder_sent_at;
                    if (lastReminder) {
                        const daysSinceReminder = (now.getTime() - lastReminder.getTime()) / MILLISECONDS_IN_DAY;
                        if (daysSinceReminder < REMIND_AGAIN_AFTER_DAYS)
                            continue;
                    }
                    const client = order.client;
                    if (!client?.email)
                        continue;
                    await (0, sendAccountsReceivableReminderEmail_1.sendAccountsReceivableReminderEmail)({
                        to: client.email,
                        clientName: client.fullName,
                        companyName: company.name,
                        orderCode: order.code,
                        orderDate: order.date,
                        total: order.total,
                        currency: company.currency || "Bs",
                    });
                    order.payment_reminder_sent_at = now;
                    await order.save();
                    await (0, notification_service_1.createNotification)(company._id, {
                        type: "payment_reminder",
                        title: "Recordatorio de pago enviado",
                        message: `Se envió un recordatorio de pago a ${client.fullName} por el pedido ${order.code}.`,
                        link: `/ventas/detalle/${order._id}`,
                    });
                    totalRecordatorios++;
                }
                catch (error) {
                    console.error(`❌ Error enviando recordatorio de pago para orden ${order.code}:`, error instanceof Error ? error.message : String(error));
                }
            }
        }
        catch (error) {
            console.error(`❌ Error procesando cuentas por cobrar para empresa ${company.name}:`, error instanceof Error ? error.message : String(error));
        }
    }
    if (totalRecordatorios === 0) {
        console.log("✅ Verificación de cuentas por cobrar completada — ningún recordatorio enviado");
    }
    else {
        console.log(`✅ Verificación de cuentas por cobrar completada — ${totalRecordatorios} recordatorio${totalRecordatorios > 1 ? "s" : ""} enviado${totalRecordatorios > 1 ? "s" : ""}`);
    }
};
exports.checkAccountsReceivable = checkAccountsReceivable;
// Ejecutar todos los días a las 09:00 am
const initAccountsReceivableCron = () => {
    node_cron_1.default.schedule("0 9 * * *", async () => {
        console.log("🕘 Ejecutando verificación de cuentas por cobrar...");
        await (0, exports.checkAccountsReceivable)();
    }, {
        timezone: "America/La_Paz",
    });
};
exports.initAccountsReceivableCron = initAccountsReceivableCron;
