/**
 * Script de verificación para Checkout Express de Promoción (sin escribir en MongoDB).
 * Ejecutar con: npx tsx scripts/test-promo-express-checkout.ts
 */
import assert from "node:assert/strict";
import {
  getMaxActiveReservationsPerCustomer,
  getNationalShippingFlatFee,
  getWebReservationGraceSeconds,
  getWebReservationMinutes,
  hashReservationToken,
  isPromoExpressCheckoutEnabled,
  resolveCheckoutShippingFee,
  verifyReservationToken,
} from "../src/shared/config/checkout-promo.config";
import { checkoutCartSchema } from "../src/schemas/cart.schema";
import { evaluatePromotionsEngine } from "../src/modules/promotions/domain/promotion-engine";

function resetEnv() {
  delete process.env.WEB_PROMO_EXPRESS_CHECKOUT;
  delete process.env.WEB_RESERVATION_MINUTES;
  delete process.env.WEB_RESERVATION_GRACE_SECONDS;
  delete process.env.NATIONAL_SHIPPING_FLAT_FEE;
  delete process.env.MAX_ACTIVE_RESERVATIONS_PER_CUSTOMER;
}

// 1. Defaults seguros (post-promo)
resetEnv();
assert.equal(isPromoExpressCheckoutEnabled(), false);
assert.equal(getWebReservationMinutes(), 30);
assert.equal(getWebReservationGraceSeconds(), 0);
assert.equal(getNationalShippingFlatFee(), 10);
assert.equal(getMaxActiveReservationsPerCustomer(), 3);

// 2. Valores de promo
process.env.WEB_PROMO_EXPRESS_CHECKOUT = "true";
process.env.WEB_RESERVATION_MINUTES = "10";
process.env.WEB_RESERVATION_GRACE_SECONDS = "30";
process.env.NATIONAL_SHIPPING_FLAT_FEE = "20";
process.env.MAX_ACTIVE_RESERVATIONS_PER_CUSTOMER = "2";

assert.equal(isPromoExpressCheckoutEnabled(), true);
assert.equal(getWebReservationMinutes(), 10);
assert.equal(getWebReservationGraceSeconds(), 30);
assert.equal(getNationalShippingFlatFee(), 20);
assert.equal(getMaxActiveReservationsPerCustomer(), 2);

// 3. Normalización de departamentos y cálculo de flete
assert.equal(
  resolveCheckoutShippingFee({ metodoEntrega: "WHATSAPP", departamento: "La Paz" }).costoEnvio,
  0
);
assert.equal(
  resolveCheckoutShippingFee({ metodoEntrega: "WHATSAPP", departamento: "  la paz " }).costoEnvio,
  0
);

const nationalInputs = [
  "Oruro",
  "Potosí",
  "potosi",
  "COCHABAMBA",
  "Sucre",
  "Chuquisaca",
  "tarija",
  "Pando",
  "BENI",
  "Santa Cruz",
];
for (const dep of nationalInputs) {
  const res = resolveCheckoutShippingFee({
    metodoEntrega: "SHIPPING_NATIONAL",
    departamento: dep,
  });
  assert.equal(res.costoEnvio, 20, `Departamento ${dep} debe cobrar Bs 20`);
  assert.equal(res.department.isNational, true, `Departamento ${dep} debe reconocerse nacional`);
}

// 4. Validaciones Zod en modo PROMO EXPRESS
const sampleItem = {
  productoId: "65f000000000000000000001",
  color: "Negro",
  talla: "M",
  cantidad: 1,
};

const guestLaPaz = checkoutCartSchema.safeParse({
  esInvitado: true,
  clienteInvitado: { nombreCompleto: "Ana Perez", telefono: "71234567" },
  items: [sampleItem],
  metodoPago: "QR",
  entrega: {
    metodo: "WHATSAPP",
    departamento: "La Paz",
    ciudad: "La Paz",
    nombreDestinatario: "Ana Perez",
    telefono: "71234567",
  },
});
assert.equal(guestLaPaz.success, true, "Invitado La Paz QR debe ser válido");

const guestNational = checkoutCartSchema.safeParse({
  esInvitado: true,
  clienteInvitado: { nombreCompleto: "Luis Mamani", telefono: "76543210" },
  items: [sampleItem],
  metodoPago: "QR",
  entrega: {
    metodo: "SHIPPING_NATIONAL",
    departamento: "Potosi",
    nombreDestinatario: "Luis Mamani",
    telefono: "76543210",
  },
});
assert.equal(guestNational.success, true, "Invitado Nacional Express sin empresa/CI debe ser válido");

const loggedNational = checkoutCartSchema.safeParse({
  metodoPago: "QR",
  entrega: {
    metodo: "SHIPPING_NATIONAL",
    departamento: "Santa Cruz",
    nombreDestinatario: "Carla Quispe",
    telefono: "70001122",
  },
});
assert.equal(loggedNational.success, true, "Logeado Nacional Express sin empresa/CI debe ser válido");

const nationalCash = checkoutCartSchema.safeParse({
  metodoPago: "EFECTIVO",
  entrega: {
    metodo: "SHIPPING_NATIONAL",
    departamento: "Oruro",
  },
});
assert.equal(nationalCash.success, false, "Envío nacional con EFECTIVO debe seguir rechazándose");

// 5. Reversibilidad Zod con WEB_PROMO_EXPRESS_CHECKOUT=false
process.env.WEB_PROMO_EXPRESS_CHECKOUT = "false";
const guestNationalStrictFail = checkoutCartSchema.safeParse({
  esInvitado: true,
  clienteInvitado: { nombreCompleto: "Luis Mamani", telefono: "76543210" },
  items: [sampleItem],
  metodoPago: "QR",
  entrega: {
    metodo: "SHIPPING_NATIONAL",
    departamento: "Potosi",
    nombreDestinatario: "Luis Mamani",
    telefono: "76543210",
  },
});
assert.equal(
  guestNationalStrictFail.success,
  false,
  "Al apagar el flag, SHIPPING_NATIONAL debe volver a exigir empresaEnvio y ciRemitente"
);

const guestNationalStrictOk = checkoutCartSchema.safeParse({
  esInvitado: true,
  clienteInvitado: { nombreCompleto: "Luis Mamani", telefono: "76543210", ci: "1234567" },
  items: [{ ...sampleItem, precio: 150 }],
  metodoPago: "QR",
  entrega: {
    metodo: "SHIPPING_NATIONAL",
    departamento: "Potosi",
    empresaEnvio: "Trans Copacabana",
    sucursal: "Terminal",
    nombreRemitente: "Luis Mamani",
    ciRemitente: "1234567",
    telefonoRemitente: "76543210",
  },
});
assert.equal(
  guestNationalStrictOk.success,
  true,
  "El flujo tradicional completo debe seguir funcionando"
);

// 6. Motor de promociones consistente con costoEnvio 0 y 20 (incluyendo ENVIO_GRATIS)
const baseLine = {
  productoId: "65f000000000000000000001",
  color: "Negro",
  talla: "M",
  cantidad: 2,
  precioUnitarioLista: 100,
  precioWebEfectivo: 90,
  precioCosto: 50,
  tieneRebajaCatalogo: true,
};

const evalLaPaz = evaluatePromotionsEngine({
  items: [baseLine],
  costoEnvio: 0,
  promocionesAutomaticas: [],
});
assert.equal(evalLaPaz.subtotalLista, 200);
assert.equal(evalLaPaz.descuentoCatalogo, 20);
assert.equal(evalLaPaz.costoEnvioFinal, 0);
assert.equal(evalLaPaz.totalFinal, 180);

const evalNational = evaluatePromotionsEngine({
  items: [baseLine],
  costoEnvio: 20,
  promocionesAutomaticas: [],
});
assert.equal(evalNational.costoEnvioOriginal, 20);
assert.equal(evalNational.costoEnvioFinal, 20);
assert.equal(evalNational.totalFinal, 200);
assert.equal(
  evalNational.subtotalLista + evalNational.costoEnvioOriginal - evalNational.descuentoTotal,
  evalNational.totalFinal
);

const evalFreeShipping = evaluatePromotionsEngine({
  items: [baseLine],
  costoEnvio: 20,
  promocionesAutomaticas: [
    {
      _id: "65f000000000000000000099",
      nombre: "Envío Gratis Promo",
      estado: "ACTIVA",
      canales: ["WEB"],
      metodoActivacion: "AUTOMATICA",
      tipo: "ENVIO_GRATIS",
      valor: 0,
      alcance: "ENVIO",
      productosIncluidos: [],
      categoriasIncluidas: [],
      productosExcluidos: [],
      condiciones: { montoMinimoCompra: 100, cantidadMinimaPrendas: 0, soloPrimeraCompra: false },
      prioridad: 10,
      acumulable: true,
      acumulableConRebajasCatalogo: true,
      usosActuales: 0,
    },
  ],
});
assert.equal(evalFreeShipping.costoEnvioOriginal, 20);
assert.equal(evalFreeShipping.descuentoEnvio, 20);
assert.equal(evalFreeShipping.costoEnvioFinal, 0);
assert.equal(evalFreeShipping.totalFinal, 180);
assert.equal(
  evalFreeShipping.subtotalLista +
    evalFreeShipping.costoEnvioOriginal -
    evalFreeShipping.descuentoTotal,
  evalFreeShipping.totalFinal
);

// 7. Token de reserva (SHA-256 + timingSafeEqual)
const token = "11111111-2222-3333-4444-555555555555";
const hash = hashReservationToken(token);
assert.equal(verifyReservationToken(token, hash), true);
assert.equal(verifyReservationToken("wrong-token", hash), false);
assert.equal(verifyReservationToken(null, hash), false);

console.log("✅ Todas las pruebas del Checkout Express de Promoción pasaron correctamente.");
