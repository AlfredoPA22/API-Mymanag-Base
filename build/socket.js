"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSaleOrderPaymentUpdate = exports.emitQrPaymentUpdate = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (httpServer, allowedOrigins) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        socket.on("join_qr_payment", (transactionId) => {
            if (typeof transactionId === "string" && transactionId) {
                socket.join(`qr:${transactionId}`);
            }
        });
        socket.on("join_sale_order", (saleOrderId) => {
            if (typeof saleOrderId === "string" && saleOrderId) {
                socket.join(`sale_order:${saleOrderId}`);
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const emitQrPaymentUpdate = (transactionId, status) => {
    io?.to(`qr:${transactionId}`).emit("qr_payment_update", { transactionId, status });
};
exports.emitQrPaymentUpdate = emitQrPaymentUpdate;
const emitSaleOrderPaymentUpdate = (saleOrderId, status) => {
    io?.to(`sale_order:${saleOrderId}`).emit("sale_order_payment_update", { saleOrderId, status });
};
exports.emitSaleOrderPaymentUpdate = emitSaleOrderPaymentUpdate;
