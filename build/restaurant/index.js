"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountRestaurantApi = mountRestaurantApi;
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const menuItems_routes_1 = __importDefault(require("./routes/menuItems.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const socket_1 = require("./socket");
require("./db"); // abre la conexión propia a Mongo al importarse
// Monta el sistema de fichas del restaurant dentro de una app de Express ya
// existente, bajo el prefijo /restaurant-api, reusando el mismo httpServer
// (y por lo tanto el mismo puerto/deploy) en vez de correr un proceso aparte.
function mountRestaurantApi(app, httpServer, corsOrigins) {
    app.get("/restaurant-api/health", (_req, res) => res.json({ ok: true }));
    app.use("/restaurant-api/categories", categories_routes_1.default);
    app.use("/restaurant-api/menu-items", menuItems_routes_1.default);
    app.use("/restaurant-api/orders", orders_routes_1.default);
    app.use("/restaurant-api/reports", reports_routes_1.default);
    (0, socket_1.initRestaurantSocket)(httpServer, corsOrigins);
    console.log("[restaurant] API montada en /restaurant-api");
}
