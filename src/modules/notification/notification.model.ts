import mongoose, { Schema as MongooseSchema } from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("notification", notificationSchema);
