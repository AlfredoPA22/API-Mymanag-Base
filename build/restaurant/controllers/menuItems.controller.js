"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMenuItems = listMenuItems;
exports.createMenuItem = createMenuItem;
exports.updateMenuItem = updateMenuItem;
exports.deleteMenuItem = deleteMenuItem;
const MenuItem_1 = __importDefault(require("../models/MenuItem"));
const Order_1 = __importDefault(require("../models/Order"));
async function listMenuItems(_req, res) {
    const items = await MenuItem_1.default.find().populate("categoria").sort({ nombre: 1 });
    res.json(items);
}
async function createMenuItem(req, res) {
    const { nombre, descripcion, precio, categoria, disponible } = req.body;
    if (!nombre || precio === undefined || !categoria) {
        return res.status(400).json({ message: "nombre, precio y categoria son requeridos" });
    }
    const item = await MenuItem_1.default.create({ nombre, descripcion, precio, categoria, disponible });
    res.status(201).json(item);
}
async function updateMenuItem(req, res) {
    const item = await MenuItem_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item)
        return res.status(404).json({ message: "Plato no encontrado" });
    res.json(item);
}
async function deleteMenuItem(req, res) {
    const usado = await Order_1.default.exists({ "items.menuItem": req.params.id });
    if (usado) {
        return res.status(409).json({
            message: "No se puede eliminar: este plato ya se usó en una venta. Podés deshabilitarlo en su lugar.",
        });
    }
    const item = await MenuItem_1.default.findByIdAndDelete(req.params.id);
    if (!item)
        return res.status(404).json({ message: "Plato no encontrado" });
    res.status(204).send();
}
