"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const saleOrderSchema = new mongoose_1.default.Schema({
    code: { type: String, required: true },
    date: { type: Date, required: true },
    client: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "client",
        required: true,
    },
    total: { type: Number, required: true, default: 0 },
    discount_type: { type: String, required: false, default: null },
    discount_value: { type: Number, required: false, default: 0 },
    discount_amount: { type: Number, required: false, default: 0 },
    status: {
        type: String,
        required: true,
        default: saleOrderStatus_enum_1.saleOrderStatus.BORRADOR,
    },
    payment_method: {
        type: String,
        required: true,
        default: saleOrderPaymentMethod_1.paymentMethod.CONTADO,
    },
    contado_payment_method: { type: String, required: false },
    is_paid: { type: Boolean, required: true, default: false },
    has_return: { type: Boolean, default: false },
    // Marca cuándo se envió el último recordatorio de pago al cliente (cuentas
    // por cobrar). Opcional y sin default distinto de null: no afecta órdenes
    // existentes ni ningún cálculo actual.
    payment_reminder_sent_at: { type: Date, default: null },
    source: { type: String, default: "manual" },
    created_by: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.SaleOrder = mongoose_1.default.model("sale_order", saleOrderSchema);
