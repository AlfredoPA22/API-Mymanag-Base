import { Request, Response } from "express";
import Order, { ESTADOS } from "../models/Order";
import { getRestaurantIO } from "../socket";
import { businessDayBounds, parseDateQuery } from "../utils/date";

// Numeración de fichas: se recicla del 1 al 50 dentro del mismo día de negocio
// (que arranca a la 1am, ver businessDayBounds). Si en el día hay más de 50
// fichas, la ficha 51 vuelve a llamarse "1".
const MAX_TICKETS_POR_DIA = 50;

export async function listOrders(req: Request, res: Response) {
  const { estado, fecha } = req.query;
  const filter: Record<string, unknown> = {};

  if (estado) filter.estado = estado;

  const day = parseDateQuery(fecha);
  const { start, end } = businessDayBounds(day, !fecha);
  filter.createdAt = { $gte: start, $lte: end };

  const orders = await Order.find(filter).sort({ numero: 1 });
  res.json(orders);
}

export async function createOrder(req: Request, res: Response) {
  const { tipo, mesa, items, metodoPago } = req.body;

  if (!tipo || !metodoPago || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "tipo, metodoPago e items son requeridos" });
  }

  const total = items.reduce(
    (acc: number, item: { precio: number; cantidad: number }) => acc + item.precio * item.cantidad,
    0
  );

  const { start, end } = businessDayBounds(new Date(), true);
  const count = await Order.countDocuments({
    createdAt: { $gte: start, $lte: end },
  });

  const order = await Order.create({
    numero: (count % MAX_TICKETS_POR_DIA) + 1,
    tipo,
    mesa: tipo === "mesa" && mesa ? mesa : undefined,
    items,
    metodoPago,
    total,
  });

  getRestaurantIO().emit("order:new", order);
  res.status(201).json(order);
}

export async function updateOrderEstado(req: Request, res: Response) {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ message: `estado debe ser uno de: ${ESTADOS.join(", ")}` });
  }

  const order = await Order.findByIdAndUpdate(req.params.id, { estado }, { new: true });
  if (!order) return res.status(404).json({ message: "Ficha no encontrada" });

  getRestaurantIO().emit("order:updated", order);
  res.json(order);
}
