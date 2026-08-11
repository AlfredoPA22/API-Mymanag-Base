"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.parseDateQuery = parseDateQuery;
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
// Un query param "YYYY-MM-DD" se parsea como fecha local en vez de dejar que
// new Date("YYYY-MM-DD") lo interprete como medianoche UTC, que en zonas horarias
// negativas (ej. Bolivia, UTC-4) cae en el día anterior una vez pasado por startOfDay.
function parseDateQuery(fecha) {
    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split("-").map(Number);
        return new Date(year, month - 1, day);
    }
    return fecha ? new Date(String(fecha)) : new Date();
}
