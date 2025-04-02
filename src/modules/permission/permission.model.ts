import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
});

export const Permission = mongoose.model("permission", permissionSchema);
