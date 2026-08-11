"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const Category_1 = __importDefault(require("../models/Category"));
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
async function listCategories(_req, res) {
    const categories = await Category_1.default.find().sort({ orden: 1, nombre: 1 });
    res.json(categories);
}
async function createCategory(req, res) {
    const { nombre, icono, orden } = req.body;
    if (!nombre)
        return res.status(400).json({ message: "nombre es requerido" });
    const category = await Category_1.default.create({ nombre, icono, orden });
    res.status(201).json(category);
}
async function updateCategory(req, res) {
    const category = await Category_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category)
        return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(category);
}
async function deleteCategory(req, res) {
    const tieneProductos = await MenuItem_1.default.exists({ categoria: req.params.id });
    if (tieneProductos) {
        return res.status(409).json({
            message: "No se puede eliminar: esta categoría tiene platos asociados. Movelos o eliminalos primero.",
        });
    }
    const category = await Category_1.default.findByIdAndDelete(req.params.id);
    if (!category)
        return res.status(404).json({ message: "Categoría no encontrada" });
    res.status(204).send();
}
