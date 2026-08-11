"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restaurantConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Conexión propia y separada de la de Inventasys (MONGODB_URI): usa otra
// variable de entorno a propósito para no pisar ni mezclarse con esa base.
const uri = process.env.RESTAURANT_MONGODB_URI || "mongodb://localhost:27017/restaurant";
exports.restaurantConnection = mongoose_1.default.createConnection(uri);
exports.restaurantConnection.on("connected", () => {
    console.log("[restaurant] MongoDB conectado");
});
exports.restaurantConnection.on("error", (error) => {
    console.error("[restaurant] Error al conectar a MongoDB:", error.message);
});
