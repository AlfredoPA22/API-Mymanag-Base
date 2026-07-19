// Redondea a 2 decimales antes de guardar, comparar o mostrar un monto de
// dinero — evita que sumas/restas de punto flotante en JS (0.1 + 0.2, etc.)
// produzcan valores como 252.89999999999998 en vez de 252.9, tanto en la
// base de datos como en comparaciones (`>=`, `===`) que dependen de un
// resultado exacto (p. ej. saber si una venta ya está totalmente pagada).
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
