import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const db =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/mymanag";

export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(db);
    console.log("Conectado a MongoDB");
  } catch (error: any) {
    console.error("Error al conectar a MongoDB:", error.message);
  }
};
