import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Conexión propia y separada de la de Inventasys (MONGODB_URI): usa otra
// variable de entorno a propósito para no pisar ni mezclarse con esa base.
const uri =
  process.env.RESTAURANT_MONGODB_URI || "mongodb://localhost:27017/restaurant";

export const restaurantConnection = mongoose.createConnection(uri);

restaurantConnection.on("connected", () => {
  console.log("[restaurant] MongoDB conectado");
});

restaurantConnection.on("error", (error) => {
  console.error("[restaurant] Error al conectar a MongoDB:", error.message);
});
