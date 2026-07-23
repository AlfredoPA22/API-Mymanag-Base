import { OAuth2Client } from "google-auth-library";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { LoginLandingInput } from "../../interfaces/userLanding.interface";
import { UserLanding } from "./user_landing.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import jwt from "jsonwebtoken";

export const loginLanding = async (loginLandingInput: LoginLandingInput) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
    throw new Error("Faltan variables de entorno críticas para autenticación");
  }

  if (!loginLandingInput.credential) {
    throw new Error("Credencial de Google no recibida");
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken: loginLandingInput.credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.name) {
    throw new Error("No se pudo obtener la información del perfil de Google");
  }
  const userLanding = await UserLanding.findOne({
    email: payload.email,
  });

  if (!userLanding) {
    const newUser = await UserLanding.create({
      email: payload.email,
      fullName: payload.name,
      picture: payload.picture,
    });

    const token = jwt.sign(
      {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        picture: newUser.picture,
        type: newUser.user_type,
        access: true,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    const tokenWithBearer = `Bearer ${token}`;

    return tokenWithBearer;
  }

  const token = jwt.sign(
    {
      id: userLanding._id,
      fullName: userLanding.fullName,
      email: userLanding.email,
      picture: userLanding.picture,
      type: userLanding.user_type,
      access: true,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  const tokenWithBearer = `Bearer ${token}`;

  return tokenWithBearer;
};

export const listUserLandingAdmin = async (
  adminUserId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const adminUser = await UserLanding.findById(adminUserId);
  if (!adminUser) throw new Error("Usuario no encontrado");
  if (adminUser.user_type !== userLandingType.ADMIN) {
    throw new Error("Acceso denegado: solo para administradores");
  }

  const users = await UserLanding.aggregate([
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
