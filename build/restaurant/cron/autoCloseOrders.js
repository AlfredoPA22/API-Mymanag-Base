"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRestaurantAutoCloseCron = initRestaurantAutoCloseCron;
const node_cron_1 = __importDefault(require("node-cron"));
const Order_1 = __importDefault(require("../models/Order"));
const socket_1 = require("../socket");
// Todos los días a la 1am (hora de Bolivia): cualquier ficha que quedó abierta
// (pendiente, en preparación o lista, pero nunca entregada ni cancelada) se
// marca como entregada — así el día de negocio arranca limpio. La numeración
// de fichas ya se reinicia sola a partir de ese mismo horario (ver
// businessDayBounds en utils/date.ts), acá solo hace falta cerrar lo abierto.
const ESTADOS_ABIERTOS = ["pendiente", "en_preparacion", "listo"];
function initRestaurantAutoCloseCron() {
    node_cron_1.default.schedule("0 1 * * *", async () => {
        try {
            const result = await Order_1.default.updateMany({ estado: { $in: ESTADOS_ABIERTOS } }, { $set: { estado: "entregado" } });
            console.log(`[restaurant] Cierre automático 1am: ${result.modifiedCount} ficha(s) pasadas a entregado`);
            if (result.modifiedCount > 0) {
                (0, socket_1.getRestaurantIO)().emit("orders:bulk_closed");
            }
        }
        catch (error) {
            console.error("[restaurant] Error en cierre automático de fichas:", error);
        }
    }, { timezone: "America/La_Paz" });
}
