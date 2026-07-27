"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserLandingAdmin = exports.loginLanding = void 0;
const google_auth_library_1 = require("google-auth-library");
const user_landing_model_1 = require("./user_landing.model");
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const loginLanding = async (loginLandingInput) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
        throw new Error("Faltan variables de entorno críticas para autenticación");
    }
    if (!loginLandingInput.credential) {
        throw new Error("Credencial de Google no recibida");
    }
    const client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
        idToken: loginLandingInput.credential,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
        throw new Error("No se pudo obtener la información del perfil de Google");
    }
    const userLanding = await user_landing_model_1.UserLanding.findOne({
        email: payload.email,
    });
    if (!userLanding) {
        const newUser = await user_landing_model_1.UserLanding.create({
            email: payload.email,
            fullName: payload.name,
            picture: payload.picture,
        });
        const token = jsonwebtoken_1.default.sign({
            id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            picture: newUser.picture,
            type: newUser.user_type,
            access: true,
        }, JWT_SECRET, {
            expiresIn: "1d",
        });
        const tokenWithBearer = `Bearer ${token}`;
        return tokenWithBearer;
    }
    const token = jsonwebtoken_1.default.sign({
        id: userLanding._id,
        fullName: userLanding.fullName,
        email: userLanding.email,
        picture: userLanding.picture,
        type: userLanding.user_type,
        access: true,
    }, JWT_SECRET, {
        expiresIn: "1d",
    });
    const tokenWithBearer = `Bearer ${token}`;
    return tokenWithBearer;
};
exports.loginLanding = loginLanding;
const listUserLandingAdmin = async (adminUserId) => {
    const adminUser = await user_landing_model_1.UserLanding.findById(adminUserId);
    if (!adminUser)
        throw new Error("Usuario no encontrado");
    if (adminUser.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("Acceso denegado: solo para administradores");
    }
    const users = await user_landing_model_1.UserLanding.aggregate([
        {
            $lookup: {
                from: "companies",
                localField: "_id",
                foreignField: "created_by",
                as: "companies",
            },
        },
        { $sort: { createdAt: -1 } },
    ]);
    return users;
};
exports.listUserLandingAdmin = listUserLandingAdmin;
