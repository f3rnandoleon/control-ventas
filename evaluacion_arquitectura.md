# Evaluación de Arquitectura de Software — `control-ventas`
> **Evaluador:** Senior Software Architect (perfil estricto)  
> **Fecha:** 2026-04-23  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · TypeScript · NextAuth v4

---

## 📊 Resumen Ejecutivo de Puntuación

| Dimensión | Puntuación | Veredicto |
|---|---|---|
| Arquitectura general | **7 / 10** | ✅ Sólida con deuda identificable |
| Seguridad | **5.5 / 10** | ⚠️ Deficiencias críticas |
| Calidad de código | **6.5 / 10** | ⚠️ Inconsistencias importantes |
| Modelado de datos | **7.5 / 10** | ✅ Bien pensado |
| Escalabilidad & Performance | **5 / 10** | 🔴 Riesgos reales en producción |
| Testing | **0 / 10** | 🔴 Inexistente |
| Observabilidad | **5.5 / 10** | ⚠️ Incompleta |
| Documentación | **3 / 10** | 🔴 Crítica |
| **TOTAL** | **5.06 / 10** | ⚠️ **No apto para producción exigente** |

---

## ✅ FORTALEZAS — Lo que funciona bien

### 1. Separación en capas (módulos/application/infrastructure)
El proyecto intenta aplicar una arquitectura modular por dominios (DDD-lite). La separación en `modules/{domain}/application/` + `infrastructure/` + `domain/` es correcta conceptualmente y mejor que un diseño CRUD plano.

```
src/modules/orders/
  ├── application/orders.service.ts   ← lógica de negocio
  ├── domain/order.utils.ts           ← utilidades puras del dominio
  └── infrastructure/orders.repository.ts ← acceso a datos
```

### 2. Manejo transaccional con `runInTransaction`
El wrapper `shared/db/runTransaction.ts` es una buena abstracción que detecta si el topología de Mongo soporta transacciones. El uso consistente en operaciones críticas (checkout, cancelación, actualización de status) es correcto.

### 3. Audit Log
La existencia de `AuditEvent` con `recordAuditEventSafe` (que no falla silenciosamente) es una práctica sólida. Los índices compuestos en `auditEvent.ts` están bien definidos.

### 4. Snapshots en Pedidos
El uso de `customerSnapshot` y `productoSnapshot` dentro de los documentos de Order/Venta es un patrón correcto. Garantiza inmutabilidad histórica y evita dependencias duras de referencias.

### 5. AppError + handleRouteError
La clase `AppError` centraliza los errores de negocio y `handleRouteError` los convierte al formato HTTP correcto de forma uniforme en todas las rutas API.

### 6. Protección anti-spoofing en Middleware
```typescript
// PREVENCIÓN DE SPOOFING:
requestHeaders.delete("x-user-id");
requestHeaders.delete("x-user-role");
```
Limpiar los headers antes de inyectarlos desde el JWT es una práctica de seguridad correcta.

### 7. Índices MongoDB bien definidos
Los modelos tienen índices compuestos sobre los campos más consultados (estado+fecha, cliente+fecha), lo que indica conciencia sobre performance de queries.

---

## 🔴 PROBLEMAS CRÍTICOS — Bloqueos para producción

### CRÍTICO-1: AUSENCIA TOTAL DE TESTS
**Severidad: 🔴 BLOQUEANTE**

No existe un solo archivo de test en todo el proyecto. Ni unitarios, ni de integración, ni e2e.

```
# Búsqueda de archivos de test:
*.test.ts → 0 resultados
*.spec.ts → 0 resultados
__tests__/ → no existe
```

El módulo más crítico del sistema (`orders.service.ts`, 740 líneas) no tiene ninguna cobertura. Cambios en la lógica de reserva de stock o estados de pedidos son ciegos sin tests.

**Acción requerida:** Implementar Jest + testing-library para servicios críticos mínimamente.

---

### CRÍTICO-2: JWT_SECRET con fallback hardcodeado
**Severidad: 🔴 SEGURIDAD**

```typescript
// resolveApiAuth.ts, línea 32
const secret = process.env.JWT_SECRET || "fallback_secret";
```

Si `JWT_SECRET` no está definido en producción, cualquier atacante que conozca el string `"fallback_secret"` puede forjar tokens válidos con cualquier rol. Esto compromete completamente la autenticación de la API externa.

**Acción requerida:** Eliminar el fallback y hacer `throw` si la variable no existe.

---

### CRÍTICO-3: `orderNumber` generado con Date.now() — colisiones garantizadas
**Severidad: 🔴 INTEGRIDAD DE DATOS**

```typescript
// orders.service.ts, línea 78
function createOrderNumber() {
  return `O-${Date.now()}`;
}

// sales.service.ts, línea 130
const numeroVenta = `V-${Date.now()}`;
```

En un entorno serverless (Vercel/AWS Lambda) con múltiples instancias concurrentes, dos requests que lleguen en el mismo milisegundo generarán el mismo número. El índice `unique` de MongoDB rechazará uno, resultando en un error 500 no controlado para el usuario.

**Acción requerida:** Usar un contador atómico con `findOneAndUpdate + $inc` o `nanoid`/`ulid` con suficiente entropía.

---

### CRÍTICO-4: `releaseExpiredReservations` en el hot path de cada request
**Severidad: 🔴 PERFORMANCE**

```typescript
// orders.service.ts — se llama en CADA GET y CADA operación:
export async function listOrdersForActor(...) {
  await releaseExpiredReservations(); // ← SIEMPRE
}

export async function getOrderForActor(...) {
  await releaseExpiredReservations(); // ← SIEMPRE
}

export async function updateOrderStatusForStaff(...) {
  await releaseExpiredReservations(); // ← SIEMPRE
}
```

Esta función hace una query a MongoDB + N transacciones (una por cada orden expirada) **en el hilo de cada request de usuario**. Bajo carga, esto degrada la latencia de todos los endpoints de pedidos.

**Acción requerida:** Mover a un cron job (`/api/jobs/release-reservations`) ejecutado periódicamente (ej. cada 5 minutos) o con Vercel Cron Jobs. **No debe estar en el hot path.**

---

### CRÍTICO-5: `GET /api/ventas` sin autenticación
**Severidad: 🔴 SEGURIDAD**

```typescript
// ventas/route.ts
export async function GET() {  // ← sin resolveApiAuth
  try {
    const ventas = await listSales();   // devuelve TODAS las ventas
    return NextResponse.json(ventas);
  }
```

El middleware protege la ruta, pero la función `GET` no verifica autenticación internamente. Si el middleware fallara o fuera bypasseado, se exponen todas las ventas. Además, `listSales()` no tiene paginación y devuelve la colección completa, lo que es un riesgo de DoS con datos.

---

## ⚠️ PROBLEMAS IMPORTANTES — Deuda técnica significativa

### IMPORTANTE-1: Dos sistemas de venta paralelos sin fuente de verdad única
**Severidad: ⚠️ ARQUITECTURA**

El proyecto tiene dos modelos de datos que representan lo mismo: `Venta` (modelo legacy) y `Order` (modelo nuevo). Existe un "fallback" de compatibilidad que mezcla ambos:

```typescript
// listCustomerOrdersWithLegacyFallback — orders.service.ts
// mapLegacyVentaToCustomerOrderView — order.utils.ts
```

Este patrón es correcto como **migración temporal**, pero si persiste indefinidamente se convierte en deuda grave. El archivo `legacy-migration.schema.ts` en schemas sugiere que no hay un plan claro de fin de migración.

**Riesgo:** Bugs difíciles de reproducir cuando el comportamiento difiere entre órdenes legacy y nuevas.

---

### IMPORTANTE-2: Middleware con lógica de autorización duplicada
**Severidad: ⚠️ ARQUITECTURA**

El middleware (`middleware.ts`) contiene lógica de autorización fina (qué rol puede hacer qué), **Y** cada route handler vuelve a verificar autenticación con `resolveApiAuth`. Hay tres capas que se solapan:

1. Middleware → permite/deniega por ruta+rol
2. `resolveApiAuth` → resuelve el usuario (Bearer o headers)
3. Servicio → vuelve a verificar roles (ej. `if (role !== "CLIENTE")`)

Esto crea inconsistencias. Por ejemplo, `GET /api/ventas` pasa el middleware (está en `protectedApiRoutes`) pero la función no llama a `resolveApiAuth`.

**Acción requerida:** Definir una estrategia clara: ¿el middleware es la única fuente de autorización o cada handler es autónomo?

---

### IMPORTANTE-3: `delivery.method` en `CreateOrderFromSaleInput` no acepta `SHIPPING_NATIONAL`
**Severidad: ⚠️ BUG LATENTE**

```typescript
// orders.service.ts, línea 64
delivery?: {
  method: "WHATSAPP" | "PICKUP_POINT";  // ← SHIPPING_NATIONAL está ausente
  ...
}
```

Pero el modelo de Mongoose y el schema de Zod sí lo aceptan. Esto significa que una orden creada desde una venta con envío nacional no mapeará el método correctamente.

---

### IMPORTANTE-4: `repository.create` acepta `Record<string, unknown>` — sin tipado
**Severidad: ⚠️ CALIDAD**

```typescript
// orders.repository.ts
create(payload: Record<string, unknown>, session?: ClientSession)
```

Se pierde toda la verificación de tipos en el punto de entrada al repositorio. Cualquier campo puede pasarse mal sin que TypeScript lo detecte en tiempo de compilación.

---

### IMPORTANTE-5: `actorRole` hardcodeado en `adjustInventoryStock`
**Severidad: ⚠️ SEGURIDAD / CORRECTITUD**

```typescript
// inventory.service.ts, línea 334
actorRole: "ADMIN",  // ← hardcodeado, no refleja el actor real
```

Si un `VENDEDOR` llama a este servicio, el audit log registrará `ADMIN` como actor. Los logs de auditoría son incorrectos.

---

### IMPORTANTE-6: Validación de entrega sin max-length en `updateOrderDeliverySchema`
**Severidad: ⚠️ SEGURIDAD**

```typescript
// order.schema.ts
pickupPoint: z.string().optional().nullable(),  // sin .max()
address: z.string().optional().nullable(),      // sin .max()
```

A diferencia del `checkoutCartSchema` que sí tiene `.max(250)`, el schema de actualización de entrega no limita la longitud. Un atacante puede enviar megabytes de texto.

---

## ⚡ PROBLEMAS MENORES — Baja severidad / mejoras de calidad

### MENOR-1: README es el boilerplate de create-next-app
El `README.md` no tiene ninguna información del proyecto real: no hay descripción de dominio, variables de entorno necesarias, setup local, roles de usuario, ni arquitectura. Para un equipo, esto es inaceptable.

### MENOR-2: Inconsistencia de idioma en nombres de campo
Los modelos mezclan inglés y español sin patrón claro:
- `order.ts`: `orderStatus`, `paymentStatus`, `fulfillmentStatus` (inglés)
- `venta.ts`: `estado`, `vendedor`, `cliente` (español)
- `order.ts`: `metodoPago`, `descuento` (español dentro del modelo en inglés)

En un mismo documento: `customer` (inglés) + `metodoPago` (español). Esto indica el proyecto creció sin un ADR (Architecture Decision Record) de idioma.

### MENOR-3: Función `assertObjectId` duplicada
```typescript
// orders.service.ts, línea 71
function assertObjectId(value: string, message: string) { ... }

// inventory.service.ts, línea 75
function assertObjectId(value: string, message: string) { ... }
```
Exactamente la misma función copiada en dos archivos. Debería vivir en `shared/`.

### MENOR-4: `product.ts` tiene campo `imagen` Y `imagenes` en variante
```typescript
imagenes: { type: [String], default: [] },
imagen: { type: String, trim: true },  // ← redundante
```
Dos campos para lo mismo sin documentación de cuál es la fuente de verdad.

### MENOR-5: `stockTotal` calculado en `pre('save')` pero puede quedar desincronizado
El `pre('save')` calcula `stockTotal = sum(variantes.stock)` pero no incluye `reservedStock`. Si se usan operaciones atómicas (`$inc`) directamente en MongoDB sin pasar por Mongoose, `stockTotal` queda desactualizado.

### MENOR-6: Sesión de 24h en JWT sin refresh
```typescript
session: { strategy: "jwt", maxAge: 24 * 60 * 60 }
```
Sin mecanismo de revocación. Si un usuario es desactivado (`isActive = false`), su JWT sigue válido hasta 24 horas. El `authorize` sí verifica `isActive`, pero esa verificación no se repite en requests subsiguientes.

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### Prioridad ALTA — Esta semana
| # | Acción | Archivo |
|---|---|---|
| 1 | Eliminar `"fallback_secret"` en JWT | `resolveApiAuth.ts:32` |
| 2 | Añadir `resolveApiAuth` al GET de ventas | `ventas/route.ts:64` |
| 3 | Añadir paginación a `listAll()` | `orders.repository.ts:11`, `sales.service.ts:219` |
| 4 | Mover `releaseExpiredReservations` a cron job | `orders.service.ts:176` |
| 5 | Añadir `.max()` a `updateOrderDeliverySchema` | `order.schema.ts:47` |
| 6 | Fix `SHIPPING_NATIONAL` en `CreateOrderFromSaleInput` | `orders.service.ts:64` |

### Prioridad MEDIA — Este mes
| # | Acción |
|---|---|
| 7 | Reemplazar `Date.now()` por generador de IDs con entropía |
| 8 | Extraer `assertObjectId` a `shared/utils/validation.ts` |
| 9 | Tipar el payload del repositorio (eliminar `Record<string, unknown>`) |
| 10 | Pasar el `actorRole` real a `adjustInventoryStock` |
| 11 | Definir ADR: idioma único para nombres de campo (inglés recomendado) |

### Prioridad BAJA — Próximo trimestre
| # | Acción |
|---|---|
| 12 | Implementar suite de tests (Jest + Supertest para API routes) |
| 13 | Definir fecha de fin de migración legacy Venta→Order y eliminar fallback |
| 14 | Reescribir README con setup real, arquitectura y variables de entorno |
| 15 | Implementar revocación de JWT o verificación `isActive` en cada request |
| 16 | Unificar el campo `imagen`/`imagenes` en el modelo de variante |

---

## 🏗️ Veredicto Final

El proyecto demuestra **pensamiento arquitectónico serio** para su nivel de complejidad. Se nota un esfuerzo deliberado en separar capas, manejar transacciones, auditar eventos y proteger rutas. Eso es valioso y diferencia este código de un CRUD básico.

Sin embargo, **tiene dos bloqueos absolutos para un ambiente de producción con tráfico real:**

1. **Cero tests** → cualquier refactor es un salto de fe.
2. **`releaseExpiredReservations` en el hot path** → latencia degradada bajo carga.
3. **JWT fallback hardcodeado** → vulnerabilidad de autenticación.

Para un proyecto personal o MVP de validación, el estado actual es aceptable. Para un producto con usuarios reales y dinero involucrado, los tres problemas anteriores deben resolverse antes de cualquier lanzamiento.
