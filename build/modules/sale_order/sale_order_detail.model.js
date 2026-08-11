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
exports.SaleOrderDetail = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const saleOrderDetailSchema = new mongoose_1.default.Schema({
    sale_order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "sale_order",
        required: true,
    },
    // Sin producto (null) cuando es un ítem sin inventario — algo que el
    // vendedor consiguió de un tercero para esta venta puntual y no maneja
    // como stock propio. En ese caso `custom_name`/`custom_cost` lo describen.
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "product",
        required: false,
        default: null,
    },
    custom_name: { type: String, required: false, default: null },
    custom_cost: { type: Number, required: false, default: null },
    inventory_usage: [
        {
            warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: "warehouse" },
            purchase_order_detail: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "purchase_order_detail",
            },
            quantity: Number,
        },
    ],
    sale_price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    serials: { type: Number, required: true, default: 0 },
    discount_type: { type: String, required: false, default: null },
    discount_value: { type: Number, required: false, default: 0 },
    discount_amount: { type: Number, required: false, default: 0 },
    subtotal: { type: Number, required: true, default: 0 },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.SaleOrderDetail = mongoose_1.default.model("sale_order_detail", saleOrderDetailSchema);
