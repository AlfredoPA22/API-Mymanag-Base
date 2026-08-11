import { Request, Response } from "express";
import MenuItem from "../models/MenuItem";
import Order from "../models/Order";

export async function listMenuItems(_req: Request, res: Response) {
  const items = await MenuItem.find().populate("categoria").sort({ nombre: 1 });
  res.json(items);
}

export async function createMenuItem(req: Request, res: Response) {
  const { nombre, descripcion, precio, categoria, disponible } = req.body;
  if (!nombre || precio === undefined || !categoria) {
    return res.status(400).json({ message: "nombre, precio y categoria son requeridos" });
  }
  const item = await MenuItem.create({ nombre, descripcion, precio, categoria, disponible });
  res.status(201).json(item);
}

export async function updateMenuItem(req: Request, res: Response) {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return res.status(404).json({ message: "Plato no encontrado" });
  res.json(item);
}

export async function deleteMenuItem(req: Request, res: Response) {
  const usado = await Order.exists({ "items.menuItem": req.params.id });
  if (usado) {
    return res.status(409).json({
      message: "No se puede eliminar: este plato ya se usó en una venta. Podés deshabilitarlo en su lugar.",
    });
  }

  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Plato no encontrado" });
  res.status(204).send();
}
