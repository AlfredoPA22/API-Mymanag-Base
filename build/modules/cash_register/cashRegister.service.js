"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCashMovement = exports.closeCashRegister = exports.openCashRegister = exports.findAll = exports.findCurrentCashRegister = void 0;
const cashRegisterStatus_enum_1 = require("../../utils/enums/cashRegisterStatus.enum");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const salePaymentMethod_1 = require("../../utils/enums/salePaymentMethod");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const cash_register_model_1 = require("./cash_register.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const sale_payment_model_1 = require("../sale_payment/sale_payment.model");
const company_model_1 = require("../company/company.model");
const money_1 = require("../../utils/money");
// Calcula cuánto efectivo debería haber en caja al momento de leerla: lo que
// había al abrir + lo que entró en efectivo (ventas al contado y cobros de
// crédito) + movimientos manuales, separado por moneda porque una empresa en
// $ puede recibir efectivo tanto en $ como en su moneda alterna (Bs). No se
// guarda en la base de datos — se recalcula cada vez que se lee la caja, así
// siempre refleja el estado real sin arriesgarse a quedar desactualizado.
const computeExpected = async (cashRegister, companyId) => {
    const from = cashRegister.opening_date;
    const to = cashRegister.closing_date ?? new Date();
    // Se usa `createdAt` (cuándo se registró en el sistema) y no `date` (la
    // fecha "de negocio" de la venta, que el usuario puede editar) — lo que
    // importa para cuadrar una caja es qué pasó físicamente durante el turno.
    const cashSales = await sale_order_model_1.SaleOrder.find({
        company: companyId,
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        payment_method: saleOrderPaymentMethod_1.paymentMethod.CONTADO,
        contado_payment_method: salePaymentMethod_1.salePaymentMethod.EFECTIVO,
        createdAt: { $gte: from, $lte: to },
    })
        .select("total currency")
        .lean();
    const cashPayments = await sale_payment_model_1.SalePayment.find({
        company: companyId,
        payment_method: salePaymentMethod_1.salePaymentMethod.EFECTIVO,
        createdAt: { $gte: from, $lte: to },
    })
        .select("amount currency")
        .lean();
    let cash_sales = 0;
    let cash_sales_bs = 0;
    for (const order of cashSales) {
        if (order.currency === "Bs")
            cash_sales_bs += order.total ?? 0;
        else
            cash_sales += order.total ?? 0;
    }
    let cash_payments = 0;
    let cash_payments_bs = 0;
    for (const payment of cashPayments) {
        if (payment.currency === "Bs")
            cash_payments_bs += payment.amount ?? 0;
        else
            cash_payments += payment.amount ?? 0;
    }
    let movements_net = 0;
    let movements_net_bs = 0;
    for (const movement of cashRegister.movements ?? []) {
        const sign = movement.type === "RETIRO" ? -1 : 1;
        if (movement.currency === "Bs")
            movements_net_bs += sign * movement.amount;
        else
            movements_net += sign * movement.amount;
    }
    const expected_amount = (0, money_1.round2)((cashRegister.opening_amount ?? 0) + cash_sales + cash_payments + movements_net);
    const expected_amount_bs = (0, money_1.round2)((cashRegister.opening_amount_bs ?? 0) + cash_sales_bs + cash_payments_bs + movements_net_bs);
    return {
        ...cashRegister,
        cash_sales: (0, money_1.round2)(cash_sales),
        cash_sales_bs: (0, money_1.round2)(cash_sales_bs),
        cash_payments: (0, money_1.round2)(cash_payments),
        cash_payments_bs: (0, money_1.round2)(cash_payments_bs),
        expected_amount,
        expected_amount_bs,
    };
};
const findCurrentCashRegister = async (companyId) => {
    const cashRegister = await cash_register_model_1.CashRegister.findOne({
        company: companyId,
        status: cashRegisterStatus_enum_1.cashRegisterStatus.ABIERTA,
    })
        .populate("opened_by")
        .populate("closed_by")
        .populate("movements.created_by")
        .lean();
    if (!cashRegister)
        return null;
    return await computeExpected(cashRegister, companyId);
};
exports.findCurrentCashRegister = findCurrentCashRegister;
const findAll = async (companyId) => {
    const cashRegisters = await cash_register_model_1.CashRegister.find({ company: companyId })
        .sort({ opening_date: -1 })
        .populate("opened_by")
        .populate("closed_by")
        .populate("movements.created_by")
        .lean();
    return await Promise.all(cashRegisters.map((cashRegister) => computeExpected(cashRegister, companyId)));
};
exports.findAll = findAll;
const openCashRegister = async (companyId, userId, input) => {
    const existingOpen = await cash_register_model_1.CashRegister.findOne({
        company: companyId,
        status: cashRegisterStatus_enum_1.cashRegisterStatus.ABIERTA,
    });
    if (existingOpen) {
        throw new Error("Ya existe una caja abierta para esta empresa");
    }
    if (input.opening_amount < 0) {
        throw new Error("El monto de apertura no puede ser negativo");
    }
    if (input.opening_amount_bs != null && input.opening_amount_bs < 0) {
        throw new Error("El monto de apertura en Bs no puede ser negativo");
    }
    const newCashRegister = await cash_register_model_1.CashRegister.create({
        company: companyId,
        opening_amount: input.opening_amount,
        opening_amount_bs: input.opening_amount_bs ?? null,
        opening_date: new Date(),
        opened_by: userId,
        notes: input.notes ?? null,
    });
    const cashRegister = await cash_register_model_1.CashRegister.findOne({ _id: newCashRegister._id, company: companyId })
        .populate("opened_by")
        .lean();
    return await computeExpected(cashRegister, companyId);
};
exports.openCashRegister = openCashRegister;
const closeCashRegister = async (companyId, userId, cashRegisterId, input) => {
    const foundCashRegister = await cash_register_model_1.CashRegister.findOne({
        _id: cashRegisterId,
        company: companyId,
        status: cashRegisterStatus_enum_1.cashRegisterStatus.ABIERTA,
    });
    if (!foundCashRegister) {
        throw new Error("No se encontró una caja abierta con ese id");
    }
    if (input.closing_amount < 0) {
        throw new Error("El monto de cierre no puede ser negativo");
    }
    if (input.closing_amount_bs != null && input.closing_amount_bs < 0) {
        throw new Error("El monto de cierre en Bs no puede ser negativo");
    }
    foundCashRegister.status = cashRegisterStatus_enum_1.cashRegisterStatus.CERRADA;
    foundCashRegister.closing_amount = input.closing_amount;
    foundCashRegister.closing_amount_bs = input.closing_amount_bs ?? null;
    foundCashRegister.closing_date = new Date();
    foundCashRegister.closed_by = userId;
    if (input.notes)
        foundCashRegister.notes = input.notes;
    await foundCashRegister.save();
    const cashRegister = await cash_register_model_1.CashRegister.findOne({ _id: cashRegisterId, company: companyId })
        .populate("opened_by")
        .populate("closed_by")
        .populate("movements.created_by")
        .lean();
    return await computeExpected(cashRegister, companyId);
};
exports.closeCashRegister = closeCashRegister;
const addCashMovement = async (companyId, userId, cashRegisterId, input) => {
    const foundCashRegister = await cash_register_model_1.CashRegister.findOne({
        _id: cashRegisterId,
        company: companyId,
        status: cashRegisterStatus_enum_1.cashRegisterStatus.ABIERTA,
    });
    if (!foundCashRegister) {
        throw new Error("No se encontró una caja abierta con ese id");
    }
    if (input.amount <= 0) {
        throw new Error("El monto del movimiento debe ser mayor a cero");
    }
    if (!input.description?.trim()) {
        throw new Error("Describe el motivo del movimiento");
    }
    const company = await company_model_1.Company.findById(companyId).lean();
    if (input.currency === "Bs" && company?.currency !== "$") {
        throw new Error("Esta empresa no maneja movimientos en Bs");
    }
    foundCashRegister.movements.push({
        type: input.type,
        amount: input.amount,
        currency: input.currency === "Bs" ? "Bs" : null,
        description: input.description.trim(),
        date: new Date(),
        created_by: userId,
    });
    await foundCashRegister.save();
    const cashRegister = await cash_register_model_1.CashRegister.findOne({ _id: cashRegisterId, company: companyId })
        .populate("opened_by")
        .populate("closed_by")
        .populate("movements.created_by")
        .lean();
    return await computeExpected(cashRegister, companyId);
};
exports.addCashMovement = addCashMovement;
