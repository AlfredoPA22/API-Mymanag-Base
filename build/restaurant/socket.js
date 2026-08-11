"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESTAURANT_SOCKET_PATH = void 0;
exports.initRestaurantSocket = initRestaurantSocket;
exports.getRestaurantIO = getRestaurantIO;
const socket_io_1 = require("socket.io");
// Path propio y distinto al de Inventasys (que usa el default "/socket.io/").
// A propósito NO contiene "/socket.io" como substring: dos servidores de
// Engine.IO en un mismo httpServer donde un path es substring del otro pueden
// interceptarse pedidos entre sí ("Session ID unknown" intermitente).
exports.RESTAURANT_SOCKET_PATH = "/restaurant-ws";
let io = null;
function initRestaurantSocket(httpServer, corsOrigins) {
    io = new socket_io_1.Server(httpServer, {
        path: exports.RESTAURANT_SOCKET_PATH,
        cors: { origin: corsOrigins },
    });
    io.on("connection", (socket) => {
        console.log("[restaurant] Cliente conectado:", socket.id);
        socket.on("disconnect", () => console.log("[restaurant] Cliente desconectado:", socket.id));
    });
    // Diagnóstico: engine.io emite esto con el motivo real cuando una conexión
    // falla ANTES de llegar a "connection" (sesión desconocida, transporte no
    // soportado, etc.) — es lo que necesitamos ver para entender el 400 en prod.
    io.engine.on("connection_error", (err) => {
        console.log("[restaurant] connection_error:", {
            code: err.code,
            message: err.message,
            context: err.context,
            url: err.req?.url,
        });
    });
    return io;
}
function getRestaurantIO() {
    if (!io)
        throw new Error("[restaurant] Socket.IO no ha sido inicializado");
    return io;
}
