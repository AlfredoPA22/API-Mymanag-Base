import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  code: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true, default: "" },
  phoneNumber: { type: String, default: "" },
});

export const Client = mongoose.model("client", clientSchema);
