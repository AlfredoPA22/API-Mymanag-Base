// Redondea a 2 decimales antes de guardar, comparar o mostrar un monto de
// dinero — evita que sumas/restas de punto flotante en JS (0.1 + 0.2, etc.)
// produzcan valores como 252.89999999999998 en vez de 252.9, tanto en la
// base de datos como en comparaciones (`>=`, `===`) que dependen de un
// resultado exacto (p. ej. saber si una venta ya está totalmente pagada).
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// Convierte un monto guardado en la moneda ALTERNA de una nota de venta
// ("Bs" para una empresa que opera en "$", ver saleOrder.service.ts#create)
// a la moneda base de la empresa, usando el tipo de cambio congelado en esa
// nota. Los montos sin `currency` (o en cualquier otra moneda) ya están en
// la moneda base y se devuelven tal cual. Úsalo antes de sumar/agrupar
// montos de distintas notas — sumarlos crudos mezcla Bs y $ en un solo total.
export const toBaseCurrency = (
  amount: number,
  currency?: string | null,
  exchangeRate?: number | null
): number => {
  if (currency === "Bs" && exchangeRate) return amount / exchangeRate;
  return amount;
};

// Convierte el monto de un documento (pago, nota, etc.) a otra moneda
// (`targetCurrency`) usando el tipo de cambio que ese documento tenía
// congelado al momento de crearse (no el tipo de cambio actual de la
// empresa) — un documento sin moneda explícita se asume en `fallbackCurrency`
// (normalmente la moneda de la empresa). Más general que toBaseCurrency():
// sirve para convertir entre dos monedas cualquiera, no solo hacia la base.
export const toOrderCurrency = (
  amount: number,
  documentCurrency: string | null | undefined,
  documentExchangeRate: number | null | undefined,
  fallbackCurrency: string,
  targetCurrency: string
): number => {
  const effective = documentCurrency ?? fallbackCurrency;
  if (effective === targetCurrency) return amount;
  if (!documentExchangeRate) return amount;
  return effective === "Bs"
    ? amount / documentExchangeRate
    : amount * documentExchangeRate;
};

// Expresión de agregación Mongo que convierte `amountField` a la moneda base
// de la empresa cuando el documento está en su moneda alterna (Bs) — usa el
// tipo de cambio congelado en el propio documento (`exchangeRateField`). Sin
// esto, `$sum` mezclaría montos en Bs y en $ en un solo total sin sentido.
// Equivalente Mongo de toBaseCurrency().
export const toBaseCurrencyExpr = (
  amountField: string,
  currencyField: string,
  exchangeRateField: string
) => ({
  $cond: [
    { $and: [{ $eq: [currencyField, "Bs"] }, { $gt: [exchangeRateField, 0] }] },
    { $divide: [amountField, exchangeRateField] },
    amountField,
  ],
});
