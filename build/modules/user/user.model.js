"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
    user_name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "role",
        required: true,
    },
    company: {
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "company",
        required: true,
    },
    is_active: { type: Boolean, default: true },
    is_global: { type: Boolean, default: false },
    is_admin: { type: Boolean, default: false },
}, { timestamps: true });
userSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
exports.User = mongoose_1.default.model("user", userSchema);
