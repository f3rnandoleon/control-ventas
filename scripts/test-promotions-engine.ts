import assert from "node:assert/strict";
import { getVariantPricing, getWebVariantPricing } from "../src/utils/pricing";
import {
  evaluatePromotionsEngine,
  type EngineLineInput,
  type EnginePromocionRule,
} from "../src/modules/promotions/domain/promotion-engine";

function makePromo(overrides: Partial<EnginePromocionRule>): EnginePromocionRule {
  return {
    _id: "promo-1",
    nombre: "Promo Base",
    estado: "ACTIVA",
    canales: ["WEB"],
    metodoActivacion: "AUTOMATICA",
    tipo: "PORCENTAJE",
    valor: 10,
    reglaNxM: null,
    descuentoMaximo: null,
    alcance: "PEDIDO",
    productosIncluidos: [],
    categoriasIncluidas: [],
    productosExcluidos: [],
    condiciones: {
      montoMinimoCompra: 0,
      cantidadMinimaPrendas: 0,
      soloPrimeraCompra: false,
    },
    prioridad: 10,
    acumulable: false,
    acumulableConRebajasCatalogo: false,
    fechaInicio: null,
    fechaFin: null,
    usoMaximoTotal: null,
    usoMaximoPorCliente: null,
    usosActuales: 0,
    ...overrides,
  };
}

function runTests() {
  const now = new Date("2026-11-19T12:00:00.000Z");

  // 1. Rebaja Web Antes/Ahora NO altera getVariantPricing (POS intacto)
  {
    const prod = {
      precioVenta: 200,
      precioCosto: 90,
      rebajaWeb: {
        activa: true,
        tipo: "PORCENTAJE" as const,
        valor: 25,
        fechaInicio: "2026-11-01T00:00:00.000Z",
        fechaFin: "2026-11-30T23:59:59.000Z",
      },
    };
    const posPrice = getVariantPricing(prod, null);
    const webPrice = getWebVariantPricing(prod, null, now);

    assert.equal(posPrice.precioVenta, 200, "POS debe mantener precio de lista");
    assert.equal(webPrice.precioLista, 200);
    assert.equal(webPrice.precioVenta, 150);
    assert.equal(webPrice.tieneRebaja, true);
    assert.equal(webPrice.porcentajeDescuento, 25);
  }

  // 2. Rebaja Web expirada devuelve precio de lista
  {
    const prod = {
      precioVenta: 200,
      precioCosto: 90,
      rebajaWeb: {
        activa: true,
        tipo: "PRECIO_FIJO" as const,
        valor: 140,
        fechaInicio: "2026-10-01T00:00:00.000Z",
        fechaFin: "2026-10-31T23:59:59.000Z",
      },
    };
    const webPrice = getWebVariantPricing(prod, null, now);
    assert.equal(webPrice.precioVenta, 200);
    assert.equal(webPrice.tieneRebaja, false);
  }

  // 3. Combo 3x2 descuenta la prenda más barata y prorratea ganancia neta
  {
    const items: EngineLineInput[] = [
      {
        productoId: "p1",
        color: "Negro",
        talla: "M",
        categoria: "Chompas",
        cantidad: 2,
        precioUnitarioLista: 200,
        precioWebEfectivo: 200,
        precioCosto: 100,
        tieneRebajaCatalogo: false,
      },
      {
        productoId: "p2",
        color: "Azul",
        talla: "S",
        categoria: "Chompas",
        cantidad: 1,
        precioUnitarioLista: 120,
        precioWebEfectivo: 120,
        precioCosto: 60,
        tieneRebajaCatalogo: false,
      },
    ];
    const promo3x2 = makePromo({
      _id: "promo-3x2",
      nombre: "3x2 Chompas",
      tipo: "NXM",
      reglaNxM: { lleva: 3, paga: 2 },
      alcance: "CATEGORIAS",
      categoriasIncluidas: ["Chompas"],
    });

    const res = evaluatePromotionsEngine({
      items,
      promocionesAutomaticas: [promo3x2],
      now,
    });

    assert.equal(res.subtotalLista, 520);
    assert.equal(res.descuentoPromociones, 120, "Debe bonificar la prenda más barata (Bs 120)");
    assert.equal(res.totalFinal, 400);
    assert.equal(res.items[1].totalLineaNeto, 0);
    assert.equal(res.gananciaTotalNeta, 400 - (200 + 60));
  }

  // 4. Cupón NO se acumula sobre productos ya rebajados por defecto (acumulableConRebajasCatalogo = false)
  {
    const items: EngineLineInput[] = [
      {
        productoId: "p-sale",
        color: "Rojo",
        talla: "M",
        categoria: "Poleras",
        cantidad: 1,
        precioUnitarioLista: 150,
        precioWebEfectivo: 100,
        precioCosto: 50,
        tieneRebajaCatalogo: true,
      },
    ];
    const couponPromo = makePromo({
      _id: "promo-cup",
      nombre: "Cupón 20%",
      metodoActivacion: "CUPON",
      tipo: "PORCENTAJE",
      valor: 20,
      acumulableConRebajasCatalogo: false,
    });

    const res = evaluatePromotionsEngine({
      items,
      promocionesAutomaticas: [],
      cuponCodigoSolicitado: "WINTER20",
      cuponContext: {
        _id: "cup-1",
        codigo: "WINTER20",
        activo: true,
        usosActuales: 0,
        usosClienteActuales: 0,
        promocion: couponPromo,
      },
      now,
    });

    assert.equal(res.cuponValido, false);
    assert.equal(res.cuponErrorCodigo, "NO_APLICA_A_PRODUCTOS");
    assert.equal(res.descuentoCatalogo, 50);
    assert.equal(res.descuentoPromociones, 0);
    assert.equal(res.totalFinal, 100);
  }

  // 5. Prorrateo exacto al centavo con monto fijo en 3 ítems de igual precio (100 / 3)
  {
    const items: EngineLineInput[] = [
      {
        productoId: "a",
        color: "Negro",
        talla: "M",
        cantidad: 1,
        precioUnitarioLista: 100,
        precioWebEfectivo: 100,
        precioCosto: 40,
        tieneRebajaCatalogo: false,
      },
      {
        productoId: "b",
        color: "Gris",
        talla: "M",
        cantidad: 1,
        precioUnitarioLista: 100,
        precioWebEfectivo: 100,
        precioCosto: 40,
        tieneRebajaCatalogo: false,
      },
      {
        productoId: "c",
        color: "Blanco",
        talla: "M",
        cantidad: 1,
        precioUnitarioLista: 100,
        precioWebEfectivo: 100,
        precioCosto: 40,
        tieneRebajaCatalogo: false,
      },
    ];
    const promoFixed = makePromo({
      _id: "promo-fix",
      nombre: "Bs 100 OFF",
      metodoActivacion: "CUPON",
      tipo: "MONTO_FIJO",
      valor: 100,
      alcance: "PEDIDO",
    });

    const res = evaluatePromotionsEngine({
      items,
      promocionesAutomaticas: [],
      cuponCodigoSolicitado: "DESC100",
      cuponContext: {
        _id: "cup-fix",
        codigo: "DESC100",
        activo: true,
        usosActuales: 0,
        usosClienteActuales: 0,
        promocion: promoFixed,
      },
      now,
    });

    assert.equal(res.cuponValido, true);
    assert.equal(res.descuentoPromociones, 100);
    assert.equal(res.totalFinal, 200);
    const sumNet = Number(
      res.items.reduce((s, it) => s + it.totalLineaNeto, 0).toFixed(2)
    );
    assert.equal(sumNet, 200, "Suma de líneas netas debe cuadrar al centavo con totalFinal");
    const sumProrated = Number(
      res.items.reduce((s, it) => s + it.descuentoProrrateado, 0).toFixed(2)
    );
    assert.equal(sumProrated, 100);
  }

  // 6. Segunda unidad al 50% + Envío gratis (acumulable en envío)
  {
    const items: EngineLineInput[] = [
      {
        productoId: "ch1",
        color: "Negro",
        talla: "L",
        categoria: "Chompas",
        cantidad: 2,
        precioUnitarioLista: 180,
        precioWebEfectivo: 180,
        precioCosto: 80,
        tieneRebajaCatalogo: false,
      },
    ];
    const promo2da = makePromo({
      _id: "promo-2da",
      nombre: "2da al 50%",
      tipo: "SEGUNDA_UNIDAD",
      valor: 50,
      alcance: "CATEGORIAS",
      categoriasIncluidas: ["Chompas"],
    });
    const promoEnvio = makePromo({
      _id: "promo-envio",
      nombre: "Envío Gratis > 250",
      tipo: "ENVIO_GRATIS",
      alcance: "ENVIO",
      condiciones: { montoMinimoCompra: 250, cantidadMinimaPrendas: 0, soloPrimeraCompra: false },
    });

    const res = evaluatePromotionsEngine({
      items,
      costoEnvio: 25,
      promocionesAutomaticas: [promo2da, promoEnvio],
      now,
    });

    assert.equal(res.subtotalLista, 360);
    assert.equal(res.descuentoPromociones, 115); // 90 (50% de 180) + 25 envío
    assert.equal(res.costoEnvioFinal, 0);
    assert.equal(res.totalFinal, 270);
  }

  console.log("ALL PROMOTIONS ENGINE & WEB PRICING TESTS PASSED (6/6)");
}

runTests();
