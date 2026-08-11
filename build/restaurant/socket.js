"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESTAURANT_SOCKET_PATH = void 0;
exports.initRestaurantSocket = initRestaurantSocket;
exports.getRestaurantIO = getRestaurantIO;
const socket_io_1 = require("socket.io");
// Path propio y distinto al de Inventasys (que usa el default "/socket.io/")
// para que ambos Socket.IO puedan convivir en el mismo httpServer sin pisarse.
exports.RESTAURANT_SOCKET_PATH = "/restaurant-api/socket.io";
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
    return io;
}
function getRestaurantIO() {
    if (!io)
        throw new Error("[restaurant] Socket.IO no ha sido inicializado");
    return io;
}
