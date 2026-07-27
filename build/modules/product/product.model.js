"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("mongoose");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const productSchema = new mongoose_1.default.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    show_in_store: { type: Boolean, default: true },
    sale_price: { type: Number, default: 0 },
    store_price: { type: Number, default: null },
    store_discount_price: { type: Number, default: null },
    last_cost_price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    brand: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "brand",
        required: true,
    },
    category: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "category",
        required: true,
    },
    stock_type: { type: String, required: true },
    min_stock: { type: Number, required: true },
    max_stock: { type: Number, required: true },
    status: { type: String, default: productStatus_enum_1.productStatus.SIN_STOCK },
    company: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
}, { timestamps: true });
exports.Product = mongoose_1.default.model("product", productSchema);
