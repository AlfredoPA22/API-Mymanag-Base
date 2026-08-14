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
exports.dailyReport = dailyReport;
const Order_1 = __importStar(require("../models/Order"));
const date_1 = require("../utils/date");
async function dailyReport(req, res) {
    const { fecha } = req.query;
    const day = (0, date_1.parseDateQuery)(fecha);
    const { start, end } = (0, date_1.businessDayBounds)(day, !fecha);
    const range = { $gte: start, $lte: end };
    const todasLasFichas = await Order_1.default.find({ createdAt: range });
    const orders = todasLasFichas.filter((o) => o.estado !== "cancelado");
    const canceladas = todasLasFichas.filter((o) => o.estado === "cancelado");
    const totalVentas = orders.reduce((acc, o) => acc + o.total, 0);
    const cantidadFichas = orders.length;
    const totalCancelado = canceladas.reduce((acc, o) => acc + o.total, 0);
    const cantidadCanceladas = canceladas.length;
    const porMetodoPago = Object.fromEntries(Order_1.METODOS_PAGO.map((metodo) => [
        metodo,
        orders.filter((o) => o.metodoPago === metodo).reduce((acc, o) => acc + o.total, 0),
    ]));
    const platosMap = new Map();
    for (const order of orders) {
        for (const item of order.items) {
            const key = item.menuItem.toString();
            const actual = platosMap.get(key) ?? { nombre: item.nombre, cantidad: 0, totalVenta: 0 };
            actual.cantidad += item.cantidad;
            actual.totalVenta += item.precio * item.cantidad;
            platosMap.set(key, actual);
        }
    }
    const platosVendidos = Array.from(platosMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    res.json({
        fecha: start,
        totalVentas,
        cantidadFichas,
        porMetodoPago,
        platosVendidos,
        cantidadCanceladas,
        totalCancelado,
    });
}
