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
exports.CashRegister = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cashRegisterStatus_enum_1 = require("../../utils/enums/cashRegisterStatus.enum");
// Un movimiento manual de efectivo durante el turno (retiro para depósito
// bancario, ingreso de vuelto, etc.) — se suma/resta al monto esperado de
// cierre junto con las ventas y cobros en efectivo del turno.
const cashMovementSchema = new mongoose_1.default.Schema({
    type: { type: String, enum: ["INGRESO", "RETIRO"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["Bs", null], default: null },
    description: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    created_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
}, { _id: false });
const cashRegisterSchema = new mongoose_1.default.Schema({
    status: {
        type: String,
        required: true,
        default: cashRegisterStatus_enum_1.cashRegisterStatus.ABIERTA,
    },
    opening_amount: { type: Number, required: true },
    // Solo se usa en empresas que operan en $ y también reciben efectivo en
    // su moneda alterna (Bs) — ver saleOrder.service.ts#create.
    opening_amount_bs: { type: Number, default: null },
    opening_date: { type: Date, required: true, default: Date.now },
    opened_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    closing_amount: { type: Number, default: null },
    closing_amount_bs: { type: Number, default: null },
    closing_date: { type: Date, default: null },
    closed_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user",
        default: null,
    },
    notes: { type: String, default: null },
    movements: { type: [cashMovementSchema], default: [] },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.CashRegister = mongoose_1.default.model("cash_register", cashRegisterSchema);
