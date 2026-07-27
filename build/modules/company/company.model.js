"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const companyPlan_enum_1 = require("../../utils/enums/companyPlan.enum");
const companyStatus_enum_1 = require("../../utils/enums/companyStatus.enum");
const systemType_enum_1 = require("../../utils/enums/systemType.enum");
const subscriptionSchema = new mongoose_1.default.Schema({
    system: { type: String, enum: Object.values(systemType_enum_1.systemType), required: true },
    plan: { type: String, enum: Object.values(companyPlan_enum_1.companyPlan), default: companyPlan_enum_1.companyPlan.FREE },
    status: { type: String, enum: Object.values(companyStatus_enum_1.companyStatus), default: companyStatus_enum_1.companyStatus.PENDING },
    trial_expires_at: { type: Date, default: null },
    subscription_expires_at: { type: Date, default: null },
    notified_before_expiration: { type: Boolean, default: false },
}, { _id: false });
const storeThemeSchema = new mongoose_1.default.Schema({
    primary: { type: String, default: "" },
    primaryDark: { type: String, default: "" },
    primaryForeground: { type: String, default: "" },
    dark: { type: String, default: "" },
    darkLight: { type: String, default: "" },
    light: { type: String, default: "" },
}, { _id: false });
const companySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    legal_name: { type: String, default: "" },
    nit: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    image: { type: String, default: "" },
    currency: { type: String, default: "Bs" },
    exchange_rate: { type: Number },
    store_enabled: { type: Boolean, default: false },
    store_banner_image: { type: String, default: "" },
    store_theme: { type: storeThemeSchema, default: null },
    // Legacy fields (kept for MyManag backward compatibility)
    plan: {
        type: String,
        enum: Object.values(companyPlan_enum_1.companyPlan),
        default: companyPlan_enum_1.companyPlan.FREE,
    },
    status: {
        type: String,
        enum: Object.values(companyStatus_enum_1.companyStatus),
        default: companyStatus_enum_1.companyStatus.PENDING,
    },
    trial_expires_at: { type: Date },
    subscription_expires_at: { type: Date },
    notified_before_expiration: { type: Boolean, default: false },
    // Multi-system subscriptions
    subscriptions: { type: [subscriptionSchema], default: [] },
    created_by: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "user_landing",
        required: true,
    },
}, { timestamps: true });
exports.Company = mongoose_1.default.model("company", companySchema);
