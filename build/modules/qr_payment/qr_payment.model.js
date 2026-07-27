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
exports.QrPayment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const qrPaymentSchema = new mongoose_1.default.Schema({
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
    sale_order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "sale_order",
        required: true,
    },
    created_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user",
    },
    client: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "client",
    },
    type: {
        type: String,
        enum: ["venta_contado", "abono_credito"],
        required: true,
    },
    transactionId: { type: String, required: true, unique: true },
    referenceId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "Bs" },
    amount_bob: { type: Number },
    exchange_rate: { type: Number },
    status: { type: String, default: "pending_transaction" },
    processed: { type: Boolean, default: false },
}, { timestamps: true });
exports.QrPayment = mongoose_1.default.model("qr_payment", qrPaymentSchema);
