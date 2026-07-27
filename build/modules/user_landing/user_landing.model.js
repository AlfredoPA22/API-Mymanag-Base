"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLanding = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const userLandingSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, default: "" },
    fullName: { type: String, required: true },
    picture: { type: String, default: "" },
    user_type: {
        type: String,
        enum: userLandingType_enum_1.userLandingType,
        default: userLandingType_enum_1.userLandingType.USER,
    },
}, { timestamps: true });
userLandingSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
exports.UserLanding = mongoose_1.default.model("user_landing", userLandingSchema);
