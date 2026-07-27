"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSerial = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("mongoose");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const productSerialSchema = new mongoose_1.default.Schema({
    serial: { type: String, required: true },
    product: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "product",
        required: true,
    },
    warehouse: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "warehouse",
        required: true,
    },
    purchase_order_detail: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "purchase_order_detail",
        required: true,
    },
    sale_order_detail: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "sale_order_detail",
        default: null,
        required: false,
    },
    status: { type: String, default: productSerialStatus_enum_1.productSerialStatus.BORRADOR },
    company: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.ProductSerial = mongoose_1.default.model("product_serial", productSerialSchema);
