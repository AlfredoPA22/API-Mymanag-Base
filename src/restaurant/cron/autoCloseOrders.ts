import cron from "node-cron";
import Order, { ESTADOS } from "../models/Order";
import { getRestaurantIO } from "../socket";

// Todos los días a la 1am (hora de Bolivia): cualquier ficha que quedó abierta
// (pendiente, en preparación o lista, pero nunca entregada ni cancelada) se
// marca como entregada — así el día de negocio arranca limpio. La numeración
// de fichas ya se reinicia sola a partir de ese mismo horario (ver
// businessDayBounds en utils/date.ts), acá solo hace falta cerrar lo abierto.
const ESTADOS_ABIERTOS: (typeof ESTADOS)[number][] = ["pendiente", "en_preparacion", "listo"];

export function initRestaurantAutoCloseCron() {
  cron.schedule(
    "0 1 * * *",
    async () => {
      try {
        const result = await Order.updateMany(
          { estado: { $in: ESTADOS_ABIERTOS } },
          { $set: { estado: "entregado" } }
        );
        console.log(`[restaurant] Cierre automático 1am: ${result.modifiedCount} ficha(s) pasadas a entregado`);
        if (result.modifiedCount > 0) {
          getRestaurantIO().emit("orders:bulk_closed");
        }
      } catch (error) {
        console.error("[restaurant] Error en cierre automático de fichas:", error);
      }
    },
    { timezone: "America/La_Paz" }
  );
}
