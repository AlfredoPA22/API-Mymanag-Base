import { Request, Response } from "express";
import Category from "../models/Category";
import MenuItem from "../models/MenuItem";

export async function listCategories(_req: Request, res: Response) {
  const categories = await Category.find().sort({ orden: 1, nombre: 1 });
  res.json(categories);
}

export async function createCategory(req: Request, res: Response) {
  const { nombre, icono, orden } = req.body;
  if (!nombre) return res.status(400).json({ message: "nombre es requerido" });
  const category = await Category.create({ nombre, icono, orden });
  res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) return res.status(404).json({ message: "Categoría no encontrada" });
  res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const tieneProductos = await MenuItem.exists({ categoria: req.params.id });
  if (tieneProductos) {
    return res.status(409).json({
      message: "No se puede eliminar: esta categoría tiene platos asociados. Movelos o eliminalos primero.",
    });
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Categoría no encontrada" });
  res.status(204).send();
}
