// Bolivia no usa horario de verano: está siempre en UTC-4 todo el año.
const BOLIVIA_OFFSET_MINUTES = -4 * 60;

// El servidor de producción (Render) suele correr en UTC, no en hora de Bolivia.
// Usar date.getHours()/getDate() ahí devolvería la hora del SERVIDOR, no la de
// Bolivia. Estas dos funciones traducen entre un instante absoluto (Date) y sus
// componentes de reloj en Bolivia, sin depender de en qué zona horaria corra
// el proceso — funcionan igual en la PC local (ya en hora de Bolivia) que en Render.
function toBoliviaClock(date: Date) {
  const d = new Date(date.getTime() + BOLIVIA_OFFSET_MINUTES * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
  };
}

function fromBoliviaClock(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const utcMs = Date.UTC(year, month, day, hour, minute, 0, 0) - BOLIVIA_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

// Un query param "YYYY-MM-DD" se interpreta como esa fecha en hora de Bolivia
// (medianoche Bolivia), no en la zona horaria del servidor.
export function parseDateQuery(fecha: unknown): Date {
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [year, month, day] = fecha.split("-").map(Number);
    return fromBoliviaClock(year, month - 1, day, 0, 0);
  }
  return fecha ? new Date(String(fecha)) : new Date();
}

// El día de negocio arranca a la 1am hora de Bolivia (no medianoche), para
// restaurantes que siguen abiertos después de medianoche.
// - Sin fecha explícita ("ahora"): rollback=true — si en Bolivia todavía no son
//   la 1am, se considera que sigue siendo el día de negocio de ayer.
// - Con fecha explícita ya parseada (medianoche Bolivia de esa fecha):
//   rollback=false — ese día arranca a la 1am de esa MISMA fecha.
export function businessDayBounds(reference: Date, rollback: boolean): { start: Date; end: Date } {
  const clock = toBoliviaClock(reference);
  let { year, month, day } = clock;

  if (rollback && clock.hour < 1) {
    const prev = new Date(Date.UTC(year, month, day - 1));
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth();
    day = prev.getUTCDate();
  }

  const start = fromBoliviaClock(year, month, day, 1, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}
