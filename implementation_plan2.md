# Refactor Estructural — Plan Definitivo

## Contexto Confirmado

- **Sin clientes externos** — no se necesitan aliases de backward compatibility
- **Solo 4 documentos** en Venta y Order — migración trivial, se puede hacer en una sola ejecución
- **Vercel** — rate limiting con Map en memoria es suficiente (single process)

---

## Fase 1: Rate Limiting + Cron de Reservas Expiradas

**Riesgo**: Bajo — solo agrega funcionalidad, no toca datos ni modelos existentes.

### 1.1 Rate Limiting

#### [NEW] `src/shared/http/rate-limit.ts`

Rate limiter en memoria con `Map<string, { count, resetAt }>`:
- Auth (login/register): **5 req/min** por IP
- API escritura (POST/PUT/DELETE): **30 req/min** por userId
- API lectura (GET): **60 req/min** por userId  
- Público (`/api/productos/publicos`): **100 req/min** por IP
- Limpieza automática del Map cada 60s vía `setInterval`

#### [MODIFY] `src/middleware.ts`

- Integrar rate limiter antes de la lógica de auth
- Extraer IP de `x-forwarded-for` (Vercel)
- Devolver `429 Too Many Requests` con header `Retry-After`

### 1.2 Cron de Reservas Expiradas

#### [NEW] `src/app/api/admin/cron/reservas-expiradas/route.ts`

Endpoint protegido por `CRON_SECRET` en header. Invocable desde Vercel Cron (`vercel.json`).

#### [NEW] `vercel.json`

```json
{ "crons": [{ "path": "/api/admin/cron/reservas-expiradas", "schedule": "*/5 * * * *" }] }
```

#### [MODIFY] `src/modules/orders/application/orders.service.ts`

Eliminar las **6 llamadas inline** a `await releaseExpiredReservations()` (líneas 309, 475, 491, 511, 565, 595).

#### [MODIFY] `src/modules/payments/application/payments.service.ts`

Eliminar las **4 llamadas inline** a `await releaseExpiredReservations()` (líneas 200, 280, 356, 651).

La función se mantiene exportada, usada solo desde el endpoint cron.

---

## Fase 2: Consolidar Venta + Order → Modelo Unificado `Pedido`

**Riesgo**: Alto — refactor masivo de ~20 archivos. Es el cambio más grande.

### Estrategia

El modelo `Pedido` absorbe **todos** los campos de `Order` + los campos financieros de `Venta` (`gananciaTotal`, `items[].precioCosto`, `items[].ganancia`). Se elimina `sourceSaleId`, `sourceSaleNumber`, y toda la lógica de sincronización.

### Archivos nuevos

#### [NEW] `src/models/pedido.ts`

Modelo Mongoose unificado. Campos clave:
- De Order: `numeroPedido`, `canal`, `estadoPedido`, `estadoPago`, `estadoEntrega`, `estadoReservaStock`, `metodoPago`, `snapshotCliente`, `snapshotEntrega`, `items[]`, `subtotal`, `descuento`, `total`, `cliente`, `vendedor`, `notas`, `motivoCancelacion`, `reservadoEn`, `reservaExpiraEn`
- De Venta: `gananciaTotal`, `items[].precioCosto`, `items[].ganancia`
- Índices equivalentes a los actuales de ambos modelos

#### [NEW] `src/types/pedido.ts`

Tipos TypeScript unificados reemplazando `types/order.ts` y `types/venta.ts`.

#### [NEW] `src/schemas/pedido.schema.ts`

Schemas Zod unificados reemplazando `schemas/order.schema.ts`.

### Archivos eliminados

#### [DELETE] `src/models/venta.ts`
#### [DELETE] `src/models/order.ts`
#### [DELETE] `src/types/venta.ts`
#### [DELETE] `src/types/order.ts`
#### [DELETE] `src/schemas/order.schema.ts`
#### [DELETE] `src/modules/sales/` (directorio completo)
#### [DELETE] `src/modules/orders/domain/order.types.ts`
#### [DELETE] `src/modules/orders/domain/order.utils.ts`

### Archivos modificados

#### [MODIFY] `src/modules/orders/application/orders.service.ts` → renombrar a `pedidos.service.ts`

- Absorber `createDirectSale` de `sales.service.ts` como `crearVentaDirecta`
- Renombrar `checkoutCartToOrder` → `crearPedidoDesdeCarrito`
- Eliminar `createOrderFromSale`, `listCustomerOrdersWithLegacyFallback`, `getCustomerOrderWithLegacyFallback`, `mapSaleStatusToOrderState`
- Todas las funciones crean un `Pedido` directamente

#### [MODIFY] `src/modules/orders/infrastructure/orders.repository.ts` → renombrar a `pedidos.repository.ts`

Cambiar todas las queries de `Order` a `Pedido`.

#### [MODIFY] `src/modules/payments/application/payments.service.ts`

- Eliminar `createSaleFromOrderIfNeeded` completamente
- En `confirmPaymentTransaction`: solo actualizar estado del Pedido + consumir stock + calcular ganancia
- Reemplazar imports de `Order` y `Venta` por `Pedido`

#### [MODIFY] `src/modules/reports/application/reports.service.ts`

Los 8 reportes cambian de `Venta.aggregate(...)` a `Pedido.aggregate(...)`. Los campos de aggregation se actualizan a nombres españoles.

#### [MODIFY] `src/modules/pos/application/pos.service.ts`

- `createPosSale` → llama a `crearVentaDirecta`
- `listMyPosSales` / `getMyPosSummary` → consultan `Pedido`

#### [MODIFY] `src/modules/fulfillment/application/fulfillment.service.ts`

Reemplazar `Order` por `Pedido`, actualizar nombres de campos.

#### [MODIFY] `src/modules/migrations/application/legacy-migration.service.ts`

Adaptar para trabajar con `Pedido`. Después de migración, se puede eliminar.

#### [MODIFY] `src/modules/ops/application/core-verification.service.ts`

Actualizar flujo E2E para usar `Pedido` en vez de `Venta` + `Order`.

### Rutas API (renombrar directorios)

| Actual | Nuevo |
|---|---|
| `src/app/api/orders/` | `src/app/api/pedidos/` |
| `src/app/api/ventas/` | Eliminado (absorbido en `/api/pedidos`) |
| `src/app/api/payments/` | `src/app/api/pagos/` |
| `src/app/api/fulfillment/` | `src/app/api/entregas/` |
| `src/app/api/cart/` | `src/app/api/carrito/` |
| `src/app/api/customers/` | `src/app/api/clientes/` |
| `src/app/api/verify/payment/` | `src/app/api/verificar/pago/` |
| `src/app/api/health/` | `src/app/api/estado/` |

Rutas que ya están en español se mantienen: `/api/ventas` (se elimina), `/api/inventario`, `/api/productos`, `/api/perfil`, `/api/reportes`, `/api/usuarios`, `/api/mis-pedidos`, `/api/uploads`.

#### [MODIFY] `src/middleware.ts`

Actualizar `protectedApiRoutes`, `adminApiRoutes`, `staffApiRoutes` con las nuevas rutas.

### Frontend (componentes + pages)

#### [MODIFY] Componentes que importan `types/venta` o `types/order`:
- `src/components/ventas/VentaTable.tsx`
- `src/components/ventas/VentaDetalleModal.tsx`
- `src/components/vendedor/VentasPropiasRecientes.tsx`
- `src/components/dashboard/VentasRecientes.tsx`
- `src/components/orders/OrdersClient.tsx`
- `src/components/orders/modals/OrderDetailModal.tsx`

#### [MODIFY] Pages:
- `src/app/dashboard/admin/ventas/page.tsx`
- `src/app/dashboard/admin/reportes/page.tsx`
- `src/app/dashboard/admin/page.tsx`
- `src/app/dashboard/vendedor/page.tsx`

#### [MODIFY] Client-side services:
- `src/services/venta.service.ts` → actualizar URLs de fetch a nuevas rutas

---

## Fase 3: Estandarizar Español en Modelos Restantes

**Riesgo**: Medio — mecánico pero extenso. Se hace después de la consolidación.

### Modelos restantes (rename de campos)

#### [MODIFY] `src/models/paymentTransaction.ts`

Renombrar campos:
- `paymentNumber` → `numeroPago`
- `amount` → `monto`
- `status` → `estado`
- `externalReference` → `referenciaExterna`
- `failureReason` → `motivoFallo`
- `confirmedAt` → `confirmadoEn`
- `failedAt` → `falladoEn`
- `refundedAt` → `reembolsadoEn`
- `comprobanteUrl` → `urlComprobante`
- `reviewToken` → `tokenRevision`
- `reviewTokenUsed` → `tokenRevisionUsado`

#### [MODIFY] `src/models/fulfillment.ts`

Renombrar campos a español: `status` → `estado`, `trackingCode` → `codigoSeguimiento`, `courierName` → `nombreTransportista`, `assignedTo` → `asignadoA`, `notes` → `notas`, timestamps a español.

#### [MODIFY] `src/models/user.ts` / `src/models/cart.ts` / `src/models/auditEvent.ts` / `src/models/customerProfile.ts` / `src/models/customerAddress.ts`

Revisar y renombrar campos que estén en inglés a español.

### Schemas, Types, Constantes

Actualizar todos los archivos en `src/schemas/`, `src/types/`, `src/constants/` para reflejar los nuevos nombres.

---

## Fase 4: Migración de Datos MongoDB

**Riesgo**: Bajo (solo 4 documentos).

#### [NEW] `scripts/migrar-a-pedido.js`

Script Node.js:
```
1. npm run backup
2. Conectar a MongoDB
3. Leer los 4 documentos de 'orders' + 'ventas'
4. Para cada Order, buscar Venta vinculada (sourceSaleId)
5. Combinar → insertar en colección 'pedidos' con campos en español
6. Para Ventas sin Order, crear Pedido equivalente
7. Renombrar campos en paymenttransactions y fulfillments
8. Verificar conteos
9. Reportar resultado
```

Con solo 4 documentos, se puede hacer manualmente desde MongoDB Compass si se prefiere.

---

## Verificación

| Verificación | Cómo |
|---|---|
| Compilación | `npx tsc --noEmit` |
| Flujo E2E | Ejecutar `POST /api/admin/ops/verify-core` |
| Build | `npm run build` (en Vercel preview) |
| Reportes | Verificar que `/api/reportes` devuelve datos correctos |
| Cron | Probar `POST /api/admin/cron/reservas-expiradas` con header |
| Rate limiting | Enviar >5 requests/min a `/api/auth/login` y verificar 429 |

---

## Estimación

| Fase | Archivos | Horas |
|---|:---:|:---:|
| 1 - Rate Limiting + Cron | ~5 | 1-2h |
| 2 - Consolidar Venta/Order | ~25 | 6-8h |
| 3 - Español restante | ~30 | 4-5h |
| 4 - Migración datos | 1 script | 1h |
| **Total** | | **12-16h** |

> [!CAUTION]
> Ejecutar en orden. Cada fase es un commit independiente que se verifica antes de la siguiente. `npm run backup` antes de Fase 4.
