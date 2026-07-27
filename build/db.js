"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToMongoDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db = process.env.MONGODB_URI ||
    "mongodb://localhost:27017/mymanag";
const connectToMongoDB = async () => {
    try {
        await mongoose_1.default.connect(db);
        console.log("Conectado a MongoDB");
    }
    catch (error) {
        console.error("Error al conectar a MongoDB:", error.message);
    }
};
exports.connectToMongoDB = connectToMongoDB;
