import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPosSalesFilter,
  createPosSaleSchemaShared,
  POS_SALE_CHANNELS,
  resolvePosSaleChannel,
} from "./pos-sale.shared";

const validItem = {
  productoId: "665f665f665f665f665f665f",
  varianteId: "665f665f665f665f665f6660",
  color: "Azul",
  colorSecundario: "Gris",
  talla: "M",
  cantidad: 1,
};

test("acepta venta POS presencial sin delivery y la enruta a canal TIENDA", () => {
  const parsed = createPosSaleSchemaShared.parse({
    items: [validItem],
    metodoPago: "EFECTIVO",
    descuento: 0,
  });

  assert.equal(parsed.delivery, undefined);
  assert.equal(resolvePosSaleChannel(parsed.delivery), "TIENDA");
});

test("acepta delivery completo y conserva canal APP_QR", () => {
  const parsed = createPosSaleSchemaShared.parse({
    items: [validItem],
    metodoPago: "QR",
    descuento: 0,
    delivery: {
      metodo: "PICKUP_POINT",
      puntoRecojo: "Plaza del Estudiante",
      telefono: "76543210",
      nombreDestinatario: "Cliente Demo",
    },
  });

  assert.equal(resolvePosSaleChannel(parsed.delivery), "APP_QR");
});

test("rechaza delivery incompleto con errores por campo", () => {
  const result = createPosSaleSchemaShared.safeParse({
    items: [validItem],
    metodoPago: "EFECTIVO",
    delivery: {
      metodo: "PICKUP_POINT",
    },
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  const issuePaths = result.error.issues.map((issue) => issue.path.join("."));
  assert.ok(issuePaths.includes("delivery.puntoRecojo"));
  assert.ok(issuePaths.includes("delivery.telefono"));
  assert.ok(issuePaths.includes("delivery.nombreDestinatario"));
});

test("las consultas POS incluyen APP_QR y TIENDA", () => {
  assert.deepEqual(POS_SALE_CHANNELS, ["APP_QR", "TIENDA"]);
  assert.deepEqual(buildPosSalesFilter("seller-1"), {
    vendedor: "seller-1",
    canal: { $in: ["APP_QR", "TIENDA"] },
  });
});
