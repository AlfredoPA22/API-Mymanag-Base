import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer, allowedOrigins: string[]) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_qr_payment", (transactionId: string) => {
      if (typeof transactionId === "string" && transactionId) {
        socket.join(`qr:${transactionId}`);
      }
    });

    socket.on("join_sale_order", (saleOrderId: string) => {
      if (typeof saleOrderId === "string" && saleOrderId) {
        socket.join(`sale_order:${saleOrderId}`);
      }
    });
  });

  return io;
};

export const emitQrPaymentUpdate = (transactionId: string, status: string) => {
  io?.to(`qr:${transactionId}`).emit("qr_payment_update", { transactionId, status });
};

export const emitSaleOrderPaymentUpdate = (saleOrderId: string, status: string) => {
  io?.to(`sale_order:${saleOrderId}`).emit("sale_order_payment_update", { saleOrderId, status });
};
