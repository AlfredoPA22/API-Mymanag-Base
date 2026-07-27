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
exports.ProductInventory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const productInventoryStatus_enum_1 = require("../../utils/enums/productInventoryStatus.enum");
const productInventorySchema = new mongoose_1.default.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "product",
        required: true,
    },
    warehouse: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "warehouse",
        required: true,
    },
    purchase_order_detail: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "purchase_order_detail",
        default: null,
        required: false,
    },
    product_transfer_detail: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "product_transfer_detail",
        default: null,
        required: false,
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
    },
    available: {
        type: Number,
        required: true,
        default: 0,
    },
    reserved: {
        type: Number,
        required: true,
        default: 0,
    },
    sold: {
        type: Number,
        required: true,
        default: 0,
    },
    transferred: {
        type: Number,
        required: true,
        default: 0,
    },
    status: { type: String, default: productInventoryStatus_enum_1.productInventoryStatus.BORRADOR },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.ProductInventory = mongoose_1.default.model("product_inventory", productInventorySchema);
