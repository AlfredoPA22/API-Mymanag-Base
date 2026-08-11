"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrders = listOrders;
exports.createOrder = createOrder;
exports.updateOrderEstado = updateOrderEstado;
const Order_1 = __importStar(require("../models/Order"));
const socket_1 = require("../socket");
const date_1 = require("../utils/date");
const NUMERO_FICHA_INICIAL = 1000;
async function listOrders(req, res) {
    const { estado, fecha } = req.query;
    const filter = {};
    if (estado)
        filter.estado = estado;
    const day = (0, date_1.parseDateQuery)(fecha);
    filter.createdAt = { $gte: (0, date_1.startOfDay)(day), $lte: (0, date_1.endOfDay)(day) };
    const orders = await Order_1.default.find(filter).sort({ numero: 1 });
    res.json(orders);
}
async function createOrder(req, res) {
    const { tipo, mesa, items, metodoPago } = req.body;
    if (!tipo || !metodoPago || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "tipo, metodoPago e items son requeridos" });
    }
    const total = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const today = new Date();
    const count = await Order_1.default.countDocuments({
        createdAt: { $gte: (0, date_1.startOfDay)(today), $lte: (0, date_1.endOfDay)(today) },
    });
    const order = await Order_1.default.create({
        numero: NUMERO_FICHA_INICIAL + count,
        tipo,
        mesa: tipo === "mesa" && mesa ? mesa : undefined,
        items,
        metodoPago,
        total,
    });
    const io = (0, socket_1.getRestaurantIO)();
    console.log(`[restaurant] emit order:new — clientes conectados en esta instancia: ${io.engine.clientsCount}`);
    io.emit("order:new", order);
    res.status(201).json(order);
}
async function updateOrderEstado(req, res) {
    const { estado } = req.body;
    if (!Order_1.ESTADOS.includes(estado)) {
        return res.status(400).json({ message: `estado debe ser uno de: ${Order_1.ESTADOS.join(", ")}` });
    }
    const order = await Order_1.default.findByIdAndUpdate(req.params.id, { estado }, { new: true });
    if (!order)
        return res.status(404).json({ message: "Ficha no encontrada" });
    const io = (0, socket_1.getRestaurantIO)();
    console.log(`[restaurant] emit order:updated — clientes conectados en esta instancia: ${io.engine.clientsCount}`);
    io.emit("order:updated", order);
    res.json(order);
}
