"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalePayment = exports.createPayment = exports.detailSalePaymentBySaleOrder = exports.listSalePaymentBySaleOrder = exports.findAll = void 0;
const mongoose_1 = require("mongoose");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const user_model_1 = require("../user/user.model");
const sale_payment_model_1 = require("./sale_payment.model");
const company_model_1 = require("../company/company.model");
const dayjs_1 = __importDefault(require("dayjs"));
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const money_1 = require("../../utils/money");
const notification_service_1 = require("../notification/notification.service");
const findAll = async (companyId, userId) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const filter = foundUser.is_global
        ? { company: companyId }
        : { company: companyId, created_by: userId };
    return await sale_payment_model_1.SalePayment.find(filter)
        .sort({ date: -1 })
        .populate({
        path: "sale_order",
        populate: {
            path: "client",
        },
    })
        .populate("created_by")
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const listSalePaymentBySaleOrder = async (companyId, userId, saleOrderId) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const filter = foundUser.is_global
        ? { company: companyId, sale_order: saleOrderId }
        : { company: companyId, created_by: userId, sale_order: saleOrderId };
    return await sale_payment_model_1.SalePayment.find(filter)
        .sort({ date: -1 })
        .populate({
        path: "sale_order",
        populate: {
            path: "client",
        },
    })
        .populate("created_by")
        .populate("company")
        .lean();
};
exports.listSalePaymentBySaleOrder = listSalePaymentBySaleOrder;
const detailSalePaymentBySaleOrder = async (companyId, saleOrderId) => {
    const payments = await sale_payment_model_1.SalePayment.find({
        company: companyId,
        sale_order: saleOrderId,
    })
        .sort({ date: -1 })
        .populate("sale_order")
        .populate("company")
        .lean();
    let saleOrder = null;
    if (payments.length > 0) {
        saleOrder = payments[0].sale_order;
    }
    else {
        saleOrder = await sale_order_model_1.SaleOrder.findOne({
            _id: saleOrderId,
            company: companyId,
        }).lean();
        if (!saleOrder) {
            throw new Error("Orden de venta no encontrada");
        }
    }
    const totalPaid = (0, money_1.round2)(payments.reduce((sum, payment) => sum + payment.amount, 0));
    return {
        sale_order: saleOrder,
        total_amount: saleOrder.total,
        total_paid: totalPaid,
        total_pending: (0, money_1.round2)(saleOrder.total - totalPaid),
    };
};
exports.detailSalePaymentBySaleOrder = detailSalePaymentBySaleOrder;
const createPayment = async (companyId, userId, salePaymentInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const inputDate = (0, dayjs_1.default)(salePaymentInput.date);
    const startOfMonth = inputDate.startOf("month").toDate();
    const endOfMonth = inputDate.endOf("month").toDate();
    const salePaymentCount = await sale_payment_model_1.SalePayment.countDocuments({
        company: companyId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "pagos", salePaymentCount, planLimits.maxSalePayment, { perMonth: true });
    const foundSaleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: salePaymentInput.sale_order,
        company: companyId,
    });
    if (!foundSaleOrder) {
        throw new Error("Venta no encontrada");
    }
    if (foundSaleOrder.payment_method !== saleOrderPaymentMethod_1.paymentMethod.CREDITO) {
        throw new Error("No se pueden agregar pagos a esta venta");
    }
    if (foundSaleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.DEVUELTO) {
        throw new Error("No se pueden agregar pagos a una venta devuelta");
    }
    const payments = await sale_payment_model_1.SalePayment.aggregate([
        {
            $match: {
                company: new mongoose_1.Types.ObjectId(companyId),
                sale_order: new mongoose_1.Types.ObjectId(salePaymentInput.sale_order),
            },
        },
        {
            $group: {
                _id: "$sale_order",
                totalPaid: { $sum: "$amount" },
            },
        },
    ]);
    const totalPaid = (0, money_1.round2)(payments[0]?.totalPaid || 0);
    const saldoPendiente = (0, money_1.round2)(foundSaleOrder.total - totalPaid);
    if ((0, money_1.round2)(salePaymentInput.amount) > saldoPendiente) {
        throw new Error(`El monto excede el saldo pendiente. Saldo actual: ${saldoPendiente}`);
    }
    const newPayment = await sale_payment_model_1.SalePayment.create({
        ...salePaymentInput,
        created_by: userId,
        company: companyId,
    });
    const nuevoTotalPagado = (0, money_1.round2)(totalPaid + salePaymentInput.amount);
    foundSaleOrder.is_paid = nuevoTotalPagado >= foundSaleOrder.total;
    await foundSaleOrder.save();
    return newPayment;
};
exports.createPayment = createPayment;
const deleteSalePayment = async (companyId, salePaymentId) => {
    const foundSalePayment = await sale_payment_model_1.SalePayment.findOne({
        _id: salePaymentId,
        company: companyId,
    });
    if (!foundSalePayment) {
        throw new Error("El pago no fue encontrado");
    }
    const foundSaleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: foundSalePayment.sale_order,
        company: companyId,
    });
    if (!foundSaleOrder) {
        throw new Error("La orden de venta no fue encontrada");
    }
    const deleteSalePayment = await sale_payment_model_1.SalePayment.deleteOne({
        _id: salePaymentId,
        company: companyId,
    });
    if (deleteSalePayment.deletedCount === 0) {
        return { success: false };
    }
    if (foundSalePayment.payment_method === "QR") {
        await (0, notification_service_1.createNotification)(companyId, {
            type: "qr_payment_deleted",
            title: "Se eliminó un pago cobrado por QR",
            message: `Se eliminó un abono de ${foundSalePayment.amount} de la venta ${foundSaleOrder.code}, que había sido cobrado por QR. El dinero ya se recibió — si corresponde, gestiona el reembolso.`,
            link: `/ventas/detalle/${foundSaleOrder._id}`,
        });
    }
    const remainingPayments = await sale_payment_model_1.SalePayment.aggregate([
        { $match: { sale_order: foundSaleOrder._id, company: companyId } },
        { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
    ]);
    const totalPaid = (0, money_1.round2)(remainingPayments[0]?.totalPaid || 0);
    const isStillPaid = totalPaid >= foundSaleOrder.total;
    foundSaleOrder.is_paid = isStillPaid;
    await foundSaleOrder.save();
    return {
        success: true,
    };
};
exports.deleteSalePayment = deleteSalePayment;
