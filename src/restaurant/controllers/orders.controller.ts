import { Request, Response } from "express";
import Order, { ESTADOS } from "../models/Order";
import { getRestaurantIO } from "../socket";
import { startOfDay, endOfDay, parseDateQuery } from "../utils/date";

const NUMERO_FICHA_INICIAL = 1000;

export async function listOrders(req: Request, res: Response) {
  const { estado, fecha } = req.query;
  const filter: Record<string, unknown> = {};

  if (estado) filter.estado = estado;

  const day = parseDateQuery(fecha);
  filter.createdAt = { $gte: startOfDay(day), $lte: endOfDay(day) };

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

  const today = new Date();
  const count = await Order.countDocuments({
    createdAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
  });

  const order = await Order.create({
    numero: NUMERO_FICHA_INICIAL + count,
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
