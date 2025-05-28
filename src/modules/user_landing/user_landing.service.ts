import { OAuth2Client } from "google-auth-library";
import { LoginLandingInput } from "../../interfaces/userLanding.interface";
import { UserLanding } from "./user_landing.model";
import jwt from "jsonwebtoken";

export const loginLanding = async (loginLandingInput: LoginLandingInput) => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken: loginLandingInput.credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

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
      process.env.JWT_SECRET,
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
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  const tokenWithBearer = `Bearer ${token}`;

  return tokenWithBearer;
};
