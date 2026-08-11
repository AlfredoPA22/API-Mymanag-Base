import { Express } from "express";
import { Server as HttpServer } from "http";
import categoriesRoutes from "./routes/categories.routes";
import menuItemsRoutes from "./routes/menuItems.routes";
import ordersRoutes from "./routes/orders.routes";
import reportsRoutes from "./routes/reports.routes";
import { initRestaurantSocket } from "./socket";
import "./db"; // abre la conexión propia a Mongo al importarse

// Monta el sistema de fichas del restaurant dentro de una app de Express ya
// existente, bajo el prefijo /restaurant-api, reusando el mismo httpServer
// (y por lo tanto el mismo puerto/deploy) en vez de correr un proceso aparte.
export function mountRestaurantApi(app: Express, httpServer: HttpServer, corsOrigins: string[]) {
  app.get("/restaurant-api/health", (_req, res) => res.json({ ok: true }));
  app.use("/restaurant-api/categories", categoriesRoutes);
  app.use("/restaurant-api/menu-items", menuItemsRoutes);
  app.use("/restaurant-api/orders", ordersRoutes);
  app.use("/restaurant-api/reports", reportsRoutes);

  initRestaurantSocket(httpServer, corsOrigins);

  console.log("[restaurant] API montada en /restaurant-api");
}
