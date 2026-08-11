"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.METODOS_PAGO = exports.TIPOS = exports.ESTADOS = void 0;
const mongoose_1 = require("mongoose");
const db_1 = require("../db");
exports.ESTADOS = ["pendiente", "en_preparacion", "listo", "entregado", "cancelado"];
exports.TIPOS = ["mesa", "llevar"];
exports.METODOS_PAGO = ["efectivo", "qr"];
const orderItemSchema = new mongoose_1.Schema({
    menuItem: { type: mongoose_1.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1 },
    notas: { type: String, trim: true },
}, { _id: false });
const orderSchema = new mongoose_1.Schema({
    numero: { type: Number, required: true },
    tipo: { type: String, enum: exports.TIPOS, required: true },
    mesa: { type: String, trim: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    estado: { type: String, enum: exports.ESTADOS, default: "pendiente" },
    metodoPago: { type: String, enum: exports.METODOS_PAGO, required: true },
    total: { type: Number, required: true, min: 0 },
}, { timestamps: true });
exports.default = db_1.restaurantConnection.model("Order", orderSchema);
