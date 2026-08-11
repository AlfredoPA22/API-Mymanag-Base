import { Request, Response } from "express";
import Order, { METODOS_PAGO } from "../models/Order";
import { startOfDay, endOfDay, parseDateQuery } from "../utils/date";

export async function dailyReport(req: Request, res: Response) {
  const { fecha } = req.query;
  const day = parseDateQuery(fecha);
  const range = { $gte: startOfDay(day), $lte: endOfDay(day) };

  const todasLasFichas = await Order.find({ createdAt: range });
  const orders = todasLasFichas.filter((o) => o.estado !== "cancelado");
  const canceladas = todasLasFichas.filter((o) => o.estado === "cancelado");

  const totalVentas = orders.reduce((acc, o) => acc + o.total, 0);
  const cantidadFichas = orders.length;

  const totalCancelado = canceladas.reduce((acc, o) => acc + o.total, 0);
  const cantidadCanceladas = canceladas.length;

  const porMetodoPago = Object.fromEntries(
    METODOS_PAGO.map((metodo) => [
      metodo,
      orders.filter((o) => o.metodoPago === metodo).reduce((acc, o) => acc + o.total, 0),
    ])
  );

  const platosMap = new Map<string, { nombre: string; cantidad: number; totalVenta: number }>();
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
    fecha: startOfDay(day),
    totalVentas,
    cantidadFichas,
    porMetodoPago,
    platosVendidos,
    cantidadCanceladas,
    totalCancelado,
  });
}
