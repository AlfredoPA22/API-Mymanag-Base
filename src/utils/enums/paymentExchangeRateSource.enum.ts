// Qué tipo de cambio usar al convertir un pago en la moneda alterna (Bs) —
// configurable por empresa porque depende del acuerdo que cada una tenga
// con sus clientes.
export enum paymentExchangeRateSource {
  // El vigente en la empresa al momento del pago (por defecto).
  ACTUAL = "actual",
  // El que quedó congelado en la nota al crearse — el pago se convierte
  // con el mismo tipo de cambio "acordado" en la venta original.
  NOTA = "nota",
}
