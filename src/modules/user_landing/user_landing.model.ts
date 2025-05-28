import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { userLandingType } from "../../utils/enums/userLandingType.enum";

const userLandingSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, default: "" },
    fullName: { type: String, required: true },
    picture: { type: String, default: "" },
    user_type: {
      type: String,
      enum: userLandingType,
      default: userLandingType.USER,
    },
  },
  { timestamps: true }
);

userLandingSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export const UserLanding = mongoose.model("user_landing", userLandingSchema);
