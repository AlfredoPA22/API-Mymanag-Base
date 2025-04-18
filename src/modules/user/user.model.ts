import mongoose from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    user_name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: MongooseSchema.Types.ObjectId,
      ref: "role",
      required: true,
    },
    is_active: { type: Boolean, default: true },
    is_global: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export const User = mongoose.model("user", userSchema);
