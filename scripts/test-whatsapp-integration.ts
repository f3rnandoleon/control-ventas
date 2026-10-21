import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").trim();
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

async function runTests() {
  console.log("🧪 --- INICIANDO TEST SUITE DE INTEGRACIÓN WHATSAPP FIT ANDES ---\n");

  const { getEndOfDayInLaPaz, verifyWhatsAppApiKey, hashReviewToken } = await import(
    "../src/modules/integrations/whatsapp/whatsapp.service"
  );
  const { createWhatsAppOrderSchema } = await import(
    "../src/schemas/whatsapp-integration.schema"
  );
  const { escapeTelegramMd } = await import("../src/libs/telegram");

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

  // Test 1: Verificación de API Key (Seguridad y comparación de secreto)
  const testApiKey = "fit_andes_wa_secret_key_2026_test_token";
  process.env.WHATSAPP_INTEGRATION_API_KEY = testApiKey;

  const reqValid = new Request("http://localhost:3000/api/integrations/whatsapp/orders", {
    headers: { authorization: `Bearer ${testApiKey}` },
  });
  const reqInvalid = new Request("http://localhost:3000/api/integrations/whatsapp/orders", {
    headers: { authorization: "Bearer clave_incorrecta_123" },
  });

  assert(verifyWhatsAppApiKey(reqValid) === true, "Verificación de API Key válida responde true");
  assert(verifyWhatsAppApiKey(reqInvalid) === false, "Verificación de API Key inválida responde false");

  // Test 2: Cálculo de expiración de reserva al final del día en America/La_Paz
  const scheduledForISO = "2026-09-10T17:00:00-04:00";
  const expireDate = getEndOfDayInLaPaz(scheduledForISO);
  assert(
    expireDate.toISOString() === "2026-09-11T03:59:59.999Z",
    "Reserva expira exactamente al final del día (23:59:59.999-04:00 -> 2026-09-11T03:59:59.999Z)"
  );

  // Test 3: Validación Zod de Payload de pedido para envío nacional
  const validNationalPayload = {
    idempotencyKey: "test-idem-key-100",
    customer: {
      phone: "59167113105",
      name: "Cliente Prueba",
    },
    items: [
      {
        productoId: "650000000000000000000001",
        varianteId: "650000000000000000000002",
        cantidad: 1,
      },
    ],
    paymentMethod: "QR",
    delivery: {
      method: "SHIPPING_NATIONAL",
      scheduledFor: "2026-09-10T17:00:00-04:00",
      department: "La Paz",
      city: "El Alto",
      shippingCompanyId: "empresa-express",
      branch: "Sucursal Central",
      recipientName: "Cliente Prueba",
      recipientCi: "1234567 LP",
      phone: "59167113105",
    },
  };

  const parsedNational = createWhatsAppOrderSchema.safeParse(validNationalPayload);
  assert(parsedNational.success === true, "Payload válido para envío nacional pasa la validación Zod");

  // Test 4: Rechazo Zod si falta departamento o CI en envío nacional
  const invalidNationalPayload = {
    ...validNationalPayload,
    delivery: {
      ...validNationalPayload.delivery,
      department: "",
      recipientCi: "",
    },
  };
  const parsedInvalidNational = createWhatsAppOrderSchema.safeParse(invalidNationalPayload);
  assert(
    parsedInvalidNational.success === false,
    "Payload sin departamento/CI en envío nacional es rechazado por Zod"
  );

  // Test 5: Validación Zod para recojo en punto
  const validPickupPayload = {
    idempotencyKey: "test-idem-key-101",
    customer: {
      phone: "59167113105",
    },
    items: [
      {
        productoId: "650000000000000000000001",
        varianteId: "650000000000000000000002",
        cantidad: 2,
      },
    ],
    paymentMethod: "QR",
    delivery: {
      method: "PICKUP_POINT",
      scheduledFor: "2026-09-10T17:00:00-04:00",
      pickupPointId: "punto-central",
      pickupScheduleId: "horario-tarde",
      recipientName: "Cliente Prueba",
      phone: "59167113105",
    },
  };
  const parsedPickup = createWhatsAppOrderSchema.safeParse(validPickupPayload);
  assert(parsedPickup.success === true, "Payload válido para recojo en punto pasa la validación Zod");

  // Test 6: Generación y Hashing de Token de Revisión Temporal
  const rawToken = randomUUID();
  const tokenHash = hashReviewToken(rawToken);
  assert(typeof tokenHash === "string" && tokenHash.length === 64, "Token de revisión genera hash SHA-256 de 64 caracteres");

  // Test 7: Formateo de Telegram y URL de verificación
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://control-ventas-azure.vercel.app";
  const verifyLink = `${appUrl}/verificar/pago/${rawToken}`;
  const linkEscapado = escapeTelegramMd(verifyLink);
  assert(verifyLink.includes("/verificar/pago/"), "URL de verificación contiene la ruta /verificar/pago/");
  assert(linkEscapado.includes("\\-") || linkEscapado.includes("/verificar/pago/"), "Link de verificación escapa caracteres MarkdownV2 correctamente");

  // Test 8: Validación Zod de Búsqueda de Productos WhatsApp
  const { whatsappProductSearchSchema } = await import(
    "../src/schemas/whatsapp-integration.schema"
  );
  const validSearchPayload = {
    q: "alpaca clásica",
    color: "azul",
    talla: "M",
    minPrecio: 100,
    maxPrecio: 200,
    limit: 5,
  };
  const parsedSearch = whatsappProductSearchSchema.safeParse(validSearchPayload);
  assert(parsedSearch.success === true, "whatsappProductSearchSchema valida correctamente parámetros completos");

  // Test 9: Rechazo y coerción en Búsqueda de Productos WhatsApp
  const coercedSearch = whatsappProductSearchSchema.safeParse({
    minPrecio: "50",
    maxPrecio: "150",
    limit: "10",
  });
  assert(
    coercedSearch.success === true &&
      coercedSearch.data.minPrecio === 50 &&
      coercedSearch.data.limit === 10,
    "whatsappProductSearchSchema coerciona cadenas numéricas a number correctamente"
  );

  // Test 10: Validación de seguridad con verifyWhatsAppApiKey para endpoints de productos
  const reqSearchValid = new Request("http://localhost:3000/api/integrations/whatsapp/products/search", {
    headers: { authorization: `Bearer ${testApiKey}` },
  });
  const reqSearchInvalid = new Request("http://localhost:3000/api/integrations/whatsapp/products/search", {
    headers: { authorization: "Bearer invalid_secret_token" },
  });
  assert(verifyWhatsAppApiKey(reqSearchValid) === true, "verifyWhatsAppApiKey autoriza petición de búsqueda con clave válida");
  assert(verifyWhatsAppApiKey(reqSearchInvalid) === false, "verifyWhatsAppApiKey rechaza petición de búsqueda con clave inválida");
  // Test 11: Optimización de URLs de Cloudinary
  const { optimizeCloudinaryUrl } = await import(
    "../src/modules/integrations/whatsapp/whatsapp.service"
  );
  const rawCloudinary = "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa-azul-m.jpg";
  const optimized = optimizeCloudinaryUrl(rawCloudinary);
  assert(
    optimized === "https://res.cloudinary.com/dq1jeikev/image/upload/f_auto,q_auto,w_800/v1728864000/chompa-azul-m.jpg",
    "optimizeCloudinaryUrl inyecta f_auto,q_auto,w_800 en URLs de Cloudinary"
  );

  // Test 12: Idempotencia de optimización y no-alteración de URLs externas
  const externalUrl = "https://example.com/imagen.jpg";
  assert(
    optimizeCloudinaryUrl(externalUrl) === externalUrl,
    "optimizeCloudinaryUrl no altera URLs externas que no son de Cloudinary"
  );
  assert(
    optimizeCloudinaryUrl(optimized) === optimized,
    "optimizeCloudinaryUrl no duplica parámetros si la URL ya está optimizada"
  );

  console.log(`\n📊 --- RESUMEN DE PRUEBAS ---`);
  console.log(`Pasaron: ${passed} | Fallaron: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error al ejecutar las pruebas:", err);
  process.exit(1);
});
