"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const db_1 = require("../db");
const menuItemSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    precio: { type: Number, required: true, min: 0 },
    categoria: { type: mongoose_1.Schema.Types.ObjectId, ref: "Category", required: true },
    disponible: { type: Boolean, default: true },
}, { timestamps: true });
exports.default = db_1.restaurantConnection.model("MenuItem", menuItemSchema);
