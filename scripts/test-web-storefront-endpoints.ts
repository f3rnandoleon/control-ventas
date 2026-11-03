import fs from "fs";
import path from "path";
import dns from "dns";

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").trim();
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val.replace(/^["']|["']$/g, "");
      }
    }
  }
}

if (process.env.MONGODB_DNS_SERVERS) {
  const dnsServers = process.env.MONGODB_DNS_SERVERS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }
}

async function runTests() {
  console.log("🧪 === TEST SUITE: STOREFRONT ENDPOINTS (FIT ANDES) ===\n");

  const { connectDB } = await import("../src/libs/mongodb");
  const { checkoutCartSchema } = await import("../src/schemas/cart.schema");
  const { getDeliveryOptions } = await import(
    "../src/modules/delivery-options/application/delivery-options.service"
  );
  const { POST: checkoutHandler } = await import(
    "../src/app/api/pedidos/checkout/route"
  );
  const { GET: relatedHandler } = await import(
    "../src/app/api/productos/publicos/[id]/relacionados/route"
  );
  const ProductoModel = (await import("../src/models/producto")).default;
  const Pedido = (await import("../src/models/pedido")).default;
  const TransaccionPago = (await import("../src/models/transaccionPago")).default;
  const NivelStock = (await import("../src/models/nivelStock")).default;
  const { getWebDispatchBranchId } = await import(
    "../src/modules/inventory/application/branch-stock.service"
  );

  async function connectWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await connectDB();
        return;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        console.log(`⚠️ Intento ${attempt} de conexión a MongoDB falló. Reintentando en 1.5s...`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  await connectWithRetry();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test Suite 1: Zod Schema Validations (checkoutCartSchema)
  // -------------------------------------------------------------
  console.log("--- 1. Pruebas de Esquema Zod (checkoutCartSchema) ---");

  // 1.1 Invitado sin items debe fallar
  const invalidGuestNoItems = checkoutCartSchema.safeParse({
    esInvitado: true,
    clienteInvitado: {
      nombreCompleto: "Carlos Pérez",
      telefono: "77712345",
      email: "carlos@test.com",
    },
    metodoPago: "QR",
    entrega: {
      metodo: "PICKUP_POINT",
      direccion: "Teleférico Morado",
      telefono: "77712345",
    },
  });
  assert(!invalidGuestNoItems.success, "Invitado sin array 'items' es rechazado");

  // 1.2 Invitado con datos de contacto incompletos
  const invalidGuestShortName = checkoutCartSchema.safeParse({
    esInvitado: true,
    clienteInvitado: {
      nombreCompleto: "Ca",
      telefono: "77712345",
    },
    items: [
      {
        productoId: "670e10a2f1b4c90012345678",
        color: "Negro",
        talla: "M",
        cantidad: 1,
        precio: 120,
      },
    ],
    metodoPago: "QR",
    entrega: {
      metodo: "PICKUP_POINT",
      direccion: "Teleférico Morado",
      telefono: "77712345",
    },
  });
  assert(!invalidGuestShortName.success, "Invitado con nombre corto (< 3) es rechazado");

  // 1.3 Envío nacional sin CI
  const invalidShippingNoCi = checkoutCartSchema.safeParse({
    esInvitado: true,
    clienteInvitado: {
      nombreCompleto: "Carlos Pérez",
      telefono: "77712345",
    },
    items: [
      {
        productoId: "670e10a2f1b4c90012345678",
        color: "Negro",
        talla: "M",
        cantidad: 1,
        precio: 120,
      },
    ],
    metodoPago: "QR",
    entrega: {
      metodo: "SHIPPING_NATIONAL",
      departamento: "Cochabamba",
      empresaEnvio: "Bolivar Cargo",
      nombreRemitente: "Carlos Pérez",
      telefonoRemitente: "77712345",
    },
  });
  assert(!invalidShippingNoCi.success, "Envío nacional sin CI en clienteInvitado ni entrega es rechazado");

  // 1.4 Envío nacional con CI válido en clienteInvitado
  const validShippingWithCi = checkoutCartSchema.safeParse({
    esInvitado: true,
    clienteInvitado: {
      nombreCompleto: "Carlos Pérez",
      telefono: "77712345",
      ci: "1234567 LP",
    },
    items: [
      {
        productoId: "670e10a2f1b4c90012345678",
        color: "Negro",
        talla: "M",
        cantidad: 1,
        precio: 120,
      },
    ],
    metodoPago: "QR",
    entrega: {
      metodo: "SHIPPING_NATIONAL",
      departamento: "Cochabamba",
      empresaEnvio: "Bolivar Cargo",
    },
  });
  assert(validShippingWithCi.success, "Envío nacional con CI en clienteInvitado es aceptado");

  // -------------------------------------------------------------
  // Test Suite 2: GET /api/delivery-options Tarifas y Costo 0
  // -------------------------------------------------------------
  console.log("\n--- 2. Pruebas de Tarifas en Delivery Options ---");
  const deliveryOpts = await getDeliveryOptions();
  assert(Array.isArray(deliveryOpts.pickupPoints), "Retorna arreglo pickupPoints");
  assert(
    deliveryOpts.pickupPoints.every(
      (p: { costoBOB?: number; costoEstimadoBOB?: number }) =>
        p.costoBOB === 0 && p.costoEstimadoBOB === 0
    ),
    "Certifica que el costo de todos los pickupPoints es 0.00 BOB"
  );

  assert(Array.isArray(deliveryOpts.shippingCompanies), "Retorna shippingCompanies");
  const hasCompanyTariffs = deliveryOpts.shippingCompanies.every(
    (c: { modalidadCobro?: string; costoEstimadoBOB?: number; tiempoEstimadoHoras?: string }) =>
      ["PAGO_EN_DESTINO", "TARIFA_FIJA", "POR_COORDINAR"].includes(c.modalidadCobro || "") &&
      typeof c.costoEstimadoBOB === "number" &&
      typeof c.tiempoEstimadoHoras === "string"
  );
  assert(hasCompanyTariffs, "Todas las shippingCompanies tienen modalidadCobro, costoEstimadoBOB y tiempoEstimadoHoras");

  const hasDeptTariffs = deliveryOpts.shippingCompanies.every((c: { departments: Array<{ modalidadCobro?: string; costoEstimadoBOB?: number; tiempoEstimadoHoras?: string }> }) =>
    c.departments.every(
      (d) =>
        ["PAGO_EN_DESTINO", "TARIFA_FIJA", "POR_COORDINAR"].includes(d.modalidadCobro || "") &&
        typeof d.costoEstimadoBOB === "number" &&
        typeof d.tiempoEstimadoHoras === "string"
    )
  );
  assert(hasDeptTariffs, "Todos los departamentos de transporte tienen tarifas calculadas/heredadas");

  // -------------------------------------------------------------
  // Test Suite 3: Flujo de Guest Checkout Atómico con Transacciones
  // -------------------------------------------------------------
  console.log("\n--- 3. Pruebas de Guest Checkout (POST /api/pedidos/checkout) ---");

  // Crear un producto temporal dedicado con stock exclusivo para la prueba
  const webBranchId = await getWebDispatchBranchId();
  const testStamp = Date.now();
  const testVarId = `VAR-${testStamp}`;

  const testProduct = await ProductoModel.create({
    nombre: `Chompa Test Storefront ${testStamp}`,
    modelo: "Andina Test",
    sku: `TST-${testStamp}`,
    precioVenta: 100,
    precioCosto: 50,
    totalVendidos: 0,
    categoria: "Chompas",
    estado: "ACTIVO",
    variantes: [
      {
        varianteId: testVarId,
        color: "Negro",
        talla: "M",
        stock: 20,
        stockReservado: 0,
        precioVenta: 100,
        precioCosto: 50,
      },
    ],
  });

  const testVariant = testProduct.variantes[0];

  // Asegurar stock en NivelStock de la sucursal web con productoId correspondiente
  await NivelStock.findOneAndUpdate(
    { sucursalId: webBranchId, varianteId: testVarId },
    { $set: { productoId: testProduct._id, stockFisico: 20, stockReservado: 0 } },
    { upsert: true }
  );

  // Ejecutar petición Checkout como Invitado
  const guestCheckoutPayload = {
    esInvitado: true,
    clienteInvitado: {
      nombreCompleto: "Invitado Storefront Test",
      telefono: "78912345",
      email: "invitado@storefront.test",
      ci: "9876543 LP",
    },
    items: [
      {
        productoId: testProduct._id.toString(),
        variantId: testVarId,
        color: testVariant.color,
        talla: testVariant.talla,
        cantidad: 2,
        precio: testVariant.precioVenta || 100,
      },
    ],
    metodoPago: "QR",
    entrega: {
      metodo: "SHIPPING_NATIONAL",
      departamento: "Santa Cruz",
      empresaEnvio: "Bolivar Cargo",
      sucursal: "Terminal Bimodal",
    },
    notas: "Nota de compra invitado test",
  };

  const guestReq = new Request("http://localhost:3000/api/pedidos/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(guestCheckoutPayload),
  });

  const checkoutResponse = await checkoutHandler(guestReq);
  const checkoutJson = await checkoutResponse.json();

  if (checkoutResponse.status !== 201) {
    console.error("CHECKOUT FAILED:", checkoutResponse.status, checkoutJson);
  }

  assert(checkoutResponse.status === 201, "Endpoint responde HTTP 201 Created para invitado");
  assert(checkoutJson.ok === true, "Estructura estándar incluye ok: true");
  assert(typeof checkoutJson.orderId === "string", "Estructura estándar incluye orderId");
  assert(typeof checkoutJson.paymentId === "string", "Estructura estándar incluye paymentId asociado");
  assert(
    typeof checkoutJson.codigo === "string" && checkoutJson.codigo.startsWith("WEB-"),
    `Estructura estándar incluye codigo generado con prefijo 'WEB-': ${checkoutJson.codigo}`
  );
  assert(typeof checkoutJson.expiresAt === "string", "Estructura estándar incluye expiresAt");

  // Verificar en base de datos la persistencia y reserva atómica
  const createdOrder = await Pedido.findById(checkoutJson.orderId);
  assert(createdOrder !== null, "El pedido existe en MongoDB");
  assert(createdOrder.estadoReservaStock === "RESERVED", "Estado de reserva es RESERVED");
  assert(createdOrder.canal === "WEB", "Canal del pedido es WEB");
  assert(createdOrder.cliente === null, "Pedido de invitado no tiene usuario asignado (cliente = null)");
  assert(
    createdOrder.datosClienteInvitado?.nombreCompleto === "Invitado Storefront Test",
    "Almacena datos en pedido.datosClienteInvitado"
  );
  assert(
    createdOrder.datosClienteInvitado?.origen === "WEB",
    "datosClienteInvitado tiene origen: 'WEB'"
  );

  const createdPayment = await TransaccionPago.findById(checkoutJson.paymentId);
  assert(createdPayment !== null, "Orden de pago TransaccionPago fue creada");
  assert(createdPayment.estado === "PENDING", "Transacción de pago está PENDING");
  assert(createdPayment.monto === createdOrder.total, "Monto de transacción coincide con total de pedido");

  // Verificar que el stock fue reservado en NivelStock
  const nivelUpdated = await NivelStock.findOne({ sucursalId: webBranchId, varianteId: testVarId });
  assert(
    (nivelUpdated?.stockReservado || 0) >= 2,
    `Stock fue reservado atómicamente en NivelStock (+${nivelUpdated?.stockReservado})`
  );

  // -------------------------------------------------------------
  // Test Suite 4: GET /api/productos/publicos/:id/relacionados
  // -------------------------------------------------------------
  console.log("\n--- 4. Pruebas de Productos Relacionados ---");

  const relatedReq = new Request(`http://localhost:3000/api/productos/publicos/${testProduct._id}/relacionados`);
  const relatedResponse = await relatedHandler(relatedReq, {
    params: Promise.resolve({ id: testProduct._id.toString() }),
  });
  const relatedJson = await relatedResponse.json();

  assert(relatedResponse.status === 200, "Endpoint responde HTTP 200 OK");
  assert(relatedJson.ok === true, "Respuesta contiene ok: true");
  assert(Array.isArray(relatedJson.data), "Respuesta contiene data como arreglo");
  assert(relatedJson.data.length <= 4, `Devuelve hasta 4 productos (obtenidos: ${relatedJson.data.length})`);

  // Verificar que ninguno es el producto actual
  const containsCurrent = relatedJson.data.some(
    (p: { _id: string }) => p._id.toString() === testProduct._id.toString()
  );
  assert(!containsCurrent, "Ninguno de los relacionados es el producto actual consultado");

  // Sanitización: verificar que NO contenga campos privados de costo
  const hasSensitiveData = relatedJson.data.some((p: Record<string, unknown>) => {
    if ("precioCosto" in p || "costoOrigen" in p || "creadoPor" in p) return true;
    const variantes = (p.variantes as Record<string, unknown>[]) || [];
    return variantes.some((v) => "precioCosto" in v || "codigoBarra" in v || "qrCode" in v);
  });
  assert(!hasSensitiveData, "Respuesta sanitizada: NO expone precioCosto ni campos internos de staff");

  // Limpieza de datos de prueba
  await Pedido.findByIdAndDelete(createdOrder._id);
  await TransaccionPago.findByIdAndDelete(createdPayment._id);
  await ProductoModel.findByIdAndDelete(testProduct._id);
  await NivelStock.deleteOne({ sucursalId: webBranchId, varianteId: testVarId });

  console.log("\n==================================================");
  console.log(`TOTAL PRUEBAS: ${passed + failed} | PASARON: ${passed} | FALLARON: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});
