import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// Path propio y distinto al de Inventasys (que usa el default "/socket.io/")
// para que ambos Socket.IO puedan convivir en el mismo httpServer sin pisarse.
export const RESTAURANT_SOCKET_PATH = "/restaurant-api/socket.io";

let io: Server | null = null;

export function initRestaurantSocket(httpServer: HttpServer, corsOrigins: string[]): Server {
  io = new Server(httpServer, {
    path: RESTAURANT_SOCKET_PATH,
    cors: { origin: corsOrigins },
  });

  io.on("connection", (socket: Socket) => {
    console.log("[restaurant] Cliente conectado:", socket.id);
    socket.on("disconnect", () => console.log("[restaurant] Cliente desconectado:", socket.id));
  });

  return io;
}

export function getRestaurantIO(): Server {
  if (!io) throw new Error("[restaurant] Socket.IO no ha sido inicializado");
  return io;
}
