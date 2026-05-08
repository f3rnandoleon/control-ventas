export function buildRecognizedSalesMatch(
  extraMatch: Record<string, unknown> = {}
) {
  return {
    ...extraMatch,
    estadoPago: "PAID",
    estadoReservaStock: "CONSUMED",
    estadoPedido: { $ne: "CANCELLED" },
  };
}
