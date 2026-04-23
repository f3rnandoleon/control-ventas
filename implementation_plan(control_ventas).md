# Plan de Remediación — control-ventas → Producción Real

> **Objetivo:** Resolver todos los problemas críticos, importantes y menores identificados en la evaluación de arquitectura.
> **Duración estimada:** 3–4 semanas de trabajo real.
> **Estrategia:** 4 fases ordenadas por impacto/riesgo. Cada fase es desplegable de forma independiente.

---

## FASE 1 — Seguridad Crítica (Día 1–3)
> ⚡ Estas correcciones deben ir a producción ANTES que cualquier otra cosa.

### 1.1 Eliminar `fallback_secret` del JWT

**Problema:** `process.env.JWT_SECRET || "fallback_secret"` en dos archivos.  
**Riesgo:** Cualquier atacante puede forjar tokens con rol ADMIN si la variable no está definida.

#### [MODIFY] [resolveApiAuth.ts](file:///c:/proyectos/control-ventas/src/libs/resolveApiAuth.ts)
```diff
- const secret = process.env.JWT_SECRET || "fallback_secret";
+ const secret = process.env.JWT_SECRET;
+ if (!secret) throw new Error("JWT_SECRET no está definido en las variables de entorno");
```

#### [MODIFY] [auth-tokens.service.ts](file:///c:/proyectos/control-ventas/src/modules/auth/application/auth-tokens.service.ts)
```diff
- const secret = process.env.JWT_SECRET || "fallback_secret";
+ const secret = process.env.JWT_SECRET;
+ if (!secret) throw new Error("JWT_SECRET no está definido en las variables de entorno");
```

**Verificación:** Arrancar sin `JWT_SECRET` definido → debe lanzar error en startup, no silenciosamente.

---

### 1.2 Asegurar `GET /api/ventas` con autenticación y paginación

**Problema:** El GET no llama a `resolveApiAuth` y devuelve toda la colección sin límite.

#### [MODIFY] [ventas/route.ts](file:///c:/proyectos/control-ventas/src/app/api/ventas/route.ts)
```diff
- export async function GET() {
+ export async function GET(request: Request) {
    try {
+     const userAuth = await resolveApiAuth(request);
+     if (!userAuth) {
+       return NextResponse.json({ message: "No autenticado" }, { status: 401 });
+     }
+     const url = new URL(request.url);
+     const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
+     const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 50));
-     const ventas = await listSales();
+     const ventas = await listSales({ page, limit });
```

#### [MODIFY] [sales.service.ts](file:///c:/proyectos/control-ventas/src/modules/sales/application/sales.service.ts)
Añadir paginación a `listSales()`:
```typescript
export async function listSales(opts?: { page?: number; limit?: number }) {
  await connectDB();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = (page - 1) * limit;
  return Venta.find()
    .populate("vendedor", "fullname email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
}
```

---

### 1.3 Añadir `.max()` a `updateOrderDeliverySchema`

**Problema:** Los campos de texto libre no tienen límite de longitud → vector de DoS.

#### [MODIFY] [order.schema.ts](file:///c:/proyectos/control-ventas/src/schemas/order.schema.ts)
```diff
  pickupPoint: z.string().max(250).optional().nullable(),
  address: z.string().max(250).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  recipientName: z.string().max(100).optional().nullable(),
  scheduledAt: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  shippingCompany: z.string().max(150).optional().nullable(),
  branch: z.string().max(150).optional().nullable(),
  senderName: z.string().max(100).optional().nullable(),
  senderCI: z.string().max(20).optional().nullable(),
  senderPhone: z.string().max(20).optional().nullable(),
```

---

### 1.4 Verificar `isActive` en cada request (revocación de sesión)

**Problema:** JWT dura 24h. Si se desactiva un usuario, sigue operando hasta que expira el token.

#### [MODIFY] [resolveApiAuth.ts](file:///c:/proyectos/control-ventas/src/libs/resolveApiAuth.ts)
Añadir verificación opcional en el path de Bearer token:
```typescript
// Después de decodificar el token, verificar estado del usuario en DB
import User from "@/models/user";
import { connectDB } from "@/libs/mongodb";

// Dentro del bloque Bearer:
await connectDB();
const dbUser = await User.findById(decoded.id).select("isActive").lean();
if (!dbUser || !dbUser.isActive) return null;
```

> [!NOTE]
> Esto añade 1 query a MongoDB por cada request Bearer. Para escalar, implementar una caché en memoria con TTL de 60s en Fase 3.

---

## FASE 2 — Performance y Estabilidad (Día 4–8)

### 2.1 Mover `releaseExpiredReservations` a un Cron Job

**Problema:** Se ejecuta en el hilo de CADA request de pedidos (GET, PUT, POST). Degrada latencia bajo carga.

#### [NEW] [/api/jobs/release-reservations/route.ts](file:///c:/proyectos/control-ventas/src/app/api/jobs/release-reservations/route.ts)
```typescript
import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/modules/orders/application/orders.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Verificar secret de cron para que solo Vercel Cron / scheduler pueda llamarlo
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  const released = await releaseExpiredReservations();
  return NextResponse.json({ released });
}
```

#### [NEW] [vercel.json](file:///c:/proyectos/control-ventas/vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/jobs/release-reservations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### [MODIFY] [orders.service.ts](file:///c:/proyectos/control-ventas/src/modules/orders/application/orders.service.ts)
Eliminar `await releaseExpiredReservations()` de `listOrdersForActor`, `getOrderForActor`, y `updateOrderStatusForStaff`.

---

### 2.2 Generador de IDs con entropía real (evitar colisiones con Date.now)

**Problema:** `O-${Date.now()}` y `V-${Date.now()}` colisionan en entornos concurrentes.

#### [NEW] [src/shared/utils/generateId.ts](file:///c:/proyectos/control-ventas/src/shared/utils/generateId.ts)
```typescript
import { randomBytes } from "crypto";

/**
 * Genera un ID secuencial único combinando timestamp + entropía aleatoria.
 * Formato: PREFIX-TIMESTAMP_BASE36-RANDOM4
 * Ejemplo: O-lp3k8f2a-3f9b
 */
export function generateOrderedId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
```

#### [MODIFY] [orders.service.ts](file:///c:/proyectos/control-ventas/src/modules/orders/application/orders.service.ts)
```diff
- function createOrderNumber() {
-   return `O-${Date.now()}`;
- }
+ import { generateOrderedId } from "@/shared/utils/generateId";
+ function createOrderNumber() {
+   return generateOrderedId("O");
+ }
```

#### [MODIFY] [sales.service.ts](file:///c:/proyectos/control-ventas/src/modules/sales/application/sales.service.ts)
```diff
- const numeroVenta = `V-${Date.now()}`;
+ const numeroVenta = generateOrderedId("V");
```

---

### 2.3 Añadir paginación a `listAll()` del repositorio de Orders

#### [MODIFY] [orders.repository.ts](file:///c:/proyectos/control-ventas/src/modules/orders/infrastructure/orders.repository.ts)
```typescript
listAll(opts?: { page?: number; limit?: number }) {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  return Order.find()
    .populate("customer", "fullname email")
    .populate("seller", "fullname email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
},
```

---

### 2.4 Corregir tipo `delivery.method` en `CreateOrderFromSaleInput`

**Problema:** `SHIPPING_NATIONAL` está ausente del tipo interno pero sí existe en modelo y schema.

#### [MODIFY] [orders.service.ts](file:///c:/proyectos/control-ventas/src/modules/orders/application/orders.service.ts) — línea 64
```diff
  delivery?: {
-   method: "WHATSAPP" | "PICKUP_POINT";
+   method: "WHATSAPP" | "PICKUP_POINT" | "SHIPPING_NATIONAL";
    pickupPoint?: string | null;
    address?: string | null;
    phone?: string | null;
+   department?: string | null;
+   city?: string | null;
+   shippingCompany?: string | null;
+   branch?: string | null;
+   senderName?: string | null;
+   senderCI?: string | null;
+   senderPhone?: string | null;
  };
```

---

## FASE 3 — Calidad de Código y Consistencia (Día 9–14)

### 3.1 Extraer `assertObjectId` a shared utils

**Problema:** Función idéntica copiada en `orders.service.ts` y `inventory.service.ts`.

#### [NEW] [src/shared/utils/validation.ts](file:///c:/proyectos/control-ventas/src/shared/utils/validation.ts)
```typescript
import mongoose from "mongoose";
import { AppError } from "@/shared/errors/AppError";

export function assertObjectId(value: string, message: string): void {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}
```

Luego eliminar la definición local de ambos servicios e importar desde `@/shared/utils/validation`.

---

### 3.2 Corregir `actorRole` hardcodeado en inventory

**Problema:** Se registra `"ADMIN"` aunque el actor real sea `"VENDEDOR"`.

#### [MODIFY] [inventory.service.ts](file:///c:/proyectos/control-ventas/src/modules/inventory/application/inventory.service.ts)
Cambiar la firma de `adjustInventoryStock` para recibir el rol real:
```diff
  type AdjustInventoryInput = VariantLookup & {
    productoId: string;
    cantidad: number;
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "DEVOLUCION";
    motivo?: string;
    referencia?: string;
    userIdRaw: string;
+   actorRole?: "ADMIN" | "VENDEDOR";
  };

  // En recordAuditEventSafe:
- actorRole: "ADMIN",
+ actorRole: input.actorRole ?? "ADMIN",
```

Actualizar todos los call-sites para pasar `actorRole` desde el handler HTTP.

---

### 3.3 Tipar el payload del repositorio de Orders

**Problema:** `create(payload: Record<string, unknown>)` pierde toda la verificación de tipos.

#### [NEW] [src/modules/orders/domain/order.types.ts](file:///c:/proyectos/control-ventas/src/modules/orders/domain/order.types.ts)
```typescript
import type { Types } from "mongoose";

export type CreateOrderPayload = {
  orderNumber: string;
  sourceSaleId: Types.ObjectId | string | null;
  sourceSaleNumber: string | null;
  channel: "WEB" | "APP_QR" | "TIENDA";
  orderStatus: "PENDING_PAYMENT" | "CONFIRMED" | "PREPARING" | "READY" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  fulfillmentStatus: "PENDING" | "READY" | "IN_TRANSIT" | "DELIVERED" | "NOT_APPLICABLE" | "CANCELLED";
  stockReservationStatus: "NONE" | "RESERVED" | "CONSUMED" | "RELEASED";
  reservedAt: Date | null;
  reservationExpiresAt: Date | null;
  metodoPago: "EFECTIVO" | "QR";
  customer: Types.ObjectId | string | null;
  seller: Types.ObjectId | string | null;
  customerSnapshot: Record<string, unknown> | null;
  deliverySnapshot: Record<string, unknown> | null;
  items: Array<{
    productoId: Types.ObjectId | string;
    variante: Record<string, unknown>;
    productoSnapshot: Record<string, unknown>;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
  }>;
  subtotal: number;
  descuento: number;
  total: number;
  notes?: string | null;
};
```

#### [MODIFY] [orders.repository.ts](file:///c:/proyectos/control-ventas/src/modules/orders/infrastructure/orders.repository.ts)
```diff
- create(payload: Record<string, unknown>, session?: ClientSession)
+ create(payload: CreateOrderPayload, session?: ClientSession)
```

---

### 3.4 Unificar campo `imagen`/`imagenes` en variante de producto

**Problema:** El modelo tiene ambos campos sin documentar cuál es la fuente de verdad.

#### [MODIFY] [product.ts](file:///c:/proyectos/control-ventas/src/models/product.ts)
```diff
- imagenes: { type: [String], default: [] },
- imagen: { type: String, trim: true },  // redundante
+ imagenes: { type: [String], default: [] },  // fuente de verdad
```

Actualizar `varianteImagen.ts` para leer siempre de `imagenes[0]` como principal.

> [!WARNING]
> Requiere migración de datos si hay documentos con `imagen` populado y `imagenes` vacío. Ejecutar script de migración antes de desplegar.

---

### 3.5 Escribir el README real del proyecto

#### [MODIFY] [README.md](file:///c:/proyectos/control-ventas/README.md)
Documentar: descripción del dominio, stack técnico, variables de entorno requeridas (`.env.example`), setup local, roles de usuario (ADMIN/VENDEDOR/CLIENTE), arquitectura de módulos, y comandos útiles.

#### [NEW] [.env.example](file:///c:/proyectos/control-ventas/.env.example)
```bash
# Base de datos
MONGODB_URL=mongodb+srv://...

# Autenticación NextAuth
NEXTAUTH_SECRET=genera-con-openssl-rand-hex-32
NEXTAUTH_URL=http://localhost:3000

# JWT para API externa
JWT_SECRET=genera-con-openssl-rand-hex-32
JWT_EXPIRES_IN=1d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cron Jobs
CRON_SECRET=genera-con-openssl-rand-hex-32
```

---

## FASE 4 — Testing (Día 15–25)

> [!IMPORTANT]
> Esta es la fase más importante para sostenibilidad. Sin tests, las fases anteriores pueden romperse en el próximo ciclo de desarrollo.

### 4.1 Setup del entorno de testing

```bash
npm install -D jest @types/jest ts-jest jest-environment-node \
  @jest/globals mongodb-memory-server
```

#### [NEW] [jest.config.ts](file:///c:/proyectos/control-ventas/jest.config.ts)
```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterFramework: ["<rootDir>/src/__tests__/setup.ts"],
};
export default config;
```

#### [NEW] [src/__tests__/setup.ts](file:///c:/proyectos/control-ventas/src/__tests__/setup.ts)
```typescript
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

### 4.2 Tests unitarios — Lógica de dominio pura

Estos tests no necesitan DB y son los más rápidos.

#### [NEW] [src/__tests__/unit/order.utils.test.ts](file:///c:/proyectos/control-ventas/src/__tests__/unit/order.utils.test.ts)
Cubrir:
- `sanitizeOrderForCustomer` → no expone `precioCosto` ni `ganancia`
- `mapLegacyVentaToCustomerOrderView` → mapeo correcto de estados
- `sortOrdersByCreatedAtDesc` → orden correcto con fechas mixtas
- `isCustomerOwnedOrder` → rechaza pedidos de otro cliente

#### [NEW] [src/__tests__/unit/generateId.test.ts](file:///c:/proyectos/control-ventas/src/__tests__/unit/generateId.test.ts)
Cubrir:
- `generateOrderedId` → formato correcto
- `generateOrderedId` → 10,000 llamadas consecutivas no producen colisiones

---

### 4.3 Tests de integración — Servicios críticos con MongoDB en memoria

#### [NEW] [src/__tests__/integration/orders.service.test.ts](file:///c:/proyectos/control-ventas/src/__tests__/integration/orders.service.test.ts)
Cubrir (mínimo):
- `checkoutCartToOrder` → reserva stock correctamente
- `checkoutCartToOrder` → falla si stock insuficiente
- `cancelOrderForCustomer` → solo cancela pedidos `PENDING_PAYMENT`
- `cancelOrderForCustomer` → libera stock reservado al cancelar
- `updateOrderStatusForStaff` → al cancelar, cambia `fulfillmentStatus` a `CANCELLED`
- `releaseExpiredReservations` → libera stock de órdenes expiradas

#### [NEW] [src/__tests__/integration/inventory.service.test.ts](file:///c:/proyectos/control-ventas/src/__tests__/integration/inventory.service.test.ts)
Cubrir:
- `adjustInventoryStock` → ENTRADA incrementa stock
- `adjustInventoryStock` → SALIDA falla si no hay stock suficiente
- `adjustInventoryStock` → AJUSTE falla si nuevo valor < `reservedStock`
- `reserveStockForOrder` + `releaseReservedStockForOrder` → ciclo completo

---

### 4.4 Tests de API — Route handlers con mocks

#### [NEW] [src/__tests__/api/orders.api.test.ts](file:///c:/proyectos/control-ventas/src/__tests__/api/orders.api.test.ts)
Cubrir:
- `GET /api/orders` sin auth → 401
- `GET /api/orders` con rol CLIENTE → solo devuelve sus pedidos
- `GET /api/orders` con rol ADMIN → devuelve todos
- `POST /api/orders/checkout` con carrito vacío → 400
- `POST /api/orders/checkout` con payload inválido → 400 + errores Zod

---

### 4.5 Script de CI (GitHub Actions)

#### [NEW] [.github/workflows/ci.yml](file:///c:/proyectos/control-ventas/.github/workflows/ci.yml)
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

Añadir a `package.json`:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

---

## Resumen de Archivos a Crear/Modificar

| Fase | Acción | Archivo |
|---|---|---|
| 1 | MODIFY | `src/libs/resolveApiAuth.ts` |
| 1 | MODIFY | `src/modules/auth/application/auth-tokens.service.ts` |
| 1 | MODIFY | `src/app/api/ventas/route.ts` |
| 1 | MODIFY | `src/modules/sales/application/sales.service.ts` |
| 1 | MODIFY | `src/schemas/order.schema.ts` |
| 2 | NEW | `src/app/api/jobs/release-reservations/route.ts` |
| 2 | NEW | `vercel.json` |
| 2 | MODIFY | `src/modules/orders/application/orders.service.ts` |
| 2 | NEW | `src/shared/utils/generateId.ts` |
| 2 | MODIFY | `src/modules/orders/infrastructure/orders.repository.ts` |
| 3 | NEW | `src/shared/utils/validation.ts` |
| 3 | MODIFY | `src/modules/inventory/application/inventory.service.ts` |
| 3 | NEW | `src/modules/orders/domain/order.types.ts` |
| 3 | MODIFY | `src/models/product.ts` |
| 3 | MODIFY | `README.md` |
| 3 | NEW | `.env.example` |
| 4 | NEW | `jest.config.ts` |
| 4 | NEW | `src/__tests__/setup.ts` |
| 4 | NEW | `src/__tests__/unit/order.utils.test.ts` |
| 4 | NEW | `src/__tests__/unit/generateId.test.ts` |
| 4 | NEW | `src/__tests__/integration/orders.service.test.ts` |
| 4 | NEW | `src/__tests__/integration/inventory.service.test.ts` |
| 4 | NEW | `src/__tests__/api/orders.api.test.ts` |
| 4 | NEW | `.github/workflows/ci.yml` |

---

## Criterio de "Listo para Producción"

- [ ] Sin `fallback_secret` en ningún archivo
- [ ] `GET /api/ventas` autenticado y paginado
- [ ] Cron job de reservas funcionando independientemente
- [ ] `generateOrderedId` reemplaza todos los `Date.now()`
- [ ] Todos los schemas tienen `.max()` en campos de texto libre
- [ ] `assertObjectId` centralizado en `shared/utils`
- [ ] Cobertura de tests ≥ 60% en `modules/orders` y `modules/inventory`
- [ ] CI verde en cada push
- [ ] `.env.example` con todas las variables documentadas
