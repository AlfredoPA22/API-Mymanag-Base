"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const db_1 = require("../db");
const categorySchema = new mongoose_1.Schema({
    nombre: { type: String, required: true, trim: true },
    icono: { type: String, trim: true },
    orden: { type: Number, default: 0 },
}, { timestamps: true });
exports.default = db_1.restaurantConnection.model("Category", categorySchema);
