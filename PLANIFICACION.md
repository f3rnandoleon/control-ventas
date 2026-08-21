# Plan de Migración: Costo/Precio por Variante + Costo Promedio Ponderado (CPP)

> **Estado:** Borrador — pendiente de aprobación antes de implementar  
> **Alcance:** Esquema de datos · API · Lógica de negocio · Migración de datos existentes  
> **Fecha de análisis:** 2026-08-21

---

## 1. Diagnóstico del esquema actual

### 1.1 Dónde viven el costo y el precio HOY

#### Modelo `Producto` — `src/models/producto.ts`

```
Producto (documento raíz)
├── precioVenta  ← Number, required, min 0   ← PRECIO ÚNICO PARA TODO EL PRODUCTO
├── precioCosto  ← Number, required, min 0   ← COSTO ÚNICO PARA TODO EL PRODUCTO
├── descuento    ← Number (% global)
└── variantes[]  ← Subdocumento embebido
    ├── varianteId
    ├── color / colorSecundario / talla
    ├── stock          ← stock físico de esta variante
    ├── stockReservado ← stock bloqueado por pedidos activos
    ├── imagenes[]
    ├── codigoBarra / qrCode
    └── (sin precioVenta ni precioCosto propios)
```

**Conclusión:** Todas las variantes de un mismo producto padre comparten exactamente el mismo `precioVenta` y `precioCosto`. No existe ningún campo de costo o precio a nivel de variante.

#### Modelo `Inventario` — `src/models/inventario.ts`

El modelo de movimientos de inventario registra:

| Campo | Tipo | ¿Registra costo? |
|---|---|---|
| `tipo` | ENTRADA / SALIDA / AJUSTE / DEVOLUCION | — |
| `cantidad` | Number | — |
| `stockAnterior` / `stockActual` | Number | — |
| `motivo` / `referencia` | String | — |

**No existe ningún campo** para `costoUnitario`, `monedaOrigen`, `tipoCambio` ni `costoResultante`. El modelo de inventario es puramente un log de cantidades, sin ningún dato financiero.

#### Modelo `Pedido` / `PedidoItem` — `src/models/pedido.ts`

Cada ítem de pedido captura:

```
PedidoItem
├── precioUnitario  ← copiado desde producto.precioVenta al momento de la venta
├── precioCosto     ← copiado desde producto.precioCosto al momento de la venta
├── ganancia        ← (precioUnitario - precioCosto) * cantidad
└── totalLinea
```

El `precioCosto` en el snapshot del pedido es el del **producto padre** en el momento de la venta. No refleja el costo real de la variante ni el tipo de cambio.

---

### 1.2 Flujo actual de precios — de extremo a extremo

| Momento | Qué lee | Archivo : línea |
|---|---|---|
| Carrito (add item) | `producto.precioVenta` | `cart.service.ts:97,122,124` |
| Carrito (update item) | `producto.precioVenta` | `cart.service.ts:175-176` |
| Checkout (validación) | `producto.precioVenta` | `cart.service.ts:274-275` |
| Checkout (ítem procesado) | `producto.precioCosto` | `pedidos.service.ts:284,304` |
| Venta directa POS (precio) | `producto.precioVenta` | `pedidos.service.ts:407` |
| Venta directa POS (costo) | `producto.precioCosto` | `pedidos.service.ts:409,433` |
| Scan QR/Barcode (POS) | `producto.precioVenta` | `catalog.service.ts:330` |
| Reportes | `$gananciaTotal` en pedido | `reports.service.ts` |

### 1.3 Validación actual de precio vs costo

En `producto.schema.ts:97-101` existe la regla:

```typescript
.refine((data) => data.precioVenta > data.precioCosto, ...)
```

Esta validación solo existe a nivel del producto padre. Con la migración, deberá replicarse por variante.

---

## 2. Propuesta de nuevo modelo de datos

### 2.1 Principios de diseño

1. **Migración aditiva:** No eliminar campos existentes de golpe; agregar los nuevos y deprecar los viejos en una fase posterior.
2. **Precio de venta editable por variante** con fallback al producto padre durante la transición.
3. **Costo CPP calculado automáticamente** en cada ENTRADA de stock con tipo de cambio.
4. **Trazabilidad completa:** Cada lote de compra queda registrado con moneda origen, TC y costo resultante.

---

### 2.2 Cambios al modelo `Variante` (embebido en `Producto`)

**Antes:**
```typescript
// varianteSchema — SIN campos de precio/costo
{
  varianteId, color, colorSecundario, talla,
  stock, stockReservado, imagenes,
  codigoBarra, qrCode, descripcion
}
```

**Después — campos nuevos a agregar:**
```typescript
{
  // ... campos existentes sin cambio ...

  // NUEVOS — precio y costo propios de la variante
  precioVenta: Number,   // precio de venta específico de esta variante (opcional en transición)
  precioCosto: Number,   // costo promedio ponderado vigente (CPP, calculado automáticamente en BOB)
  monedaCompra: String,  // ej: "PEN", "USD" — moneda en que se compra esta variante
}
```

> **Regla de negocio:** `variante.precioCosto` es el **CPP vigente** expresado en moneda local (BOB). Se recalcula en cada ENTRADA de stock con costo.

---

### 2.3 Nuevo modelo: `MovimientoCosto`

Esta es la tabla central para trazabilidad y cálculo de CPP. Es una **colección separada** (no un subdocumento embebido), porque puede crecer ilimitadamente.

```typescript
// Colección: movimientoscosto
{
  // Referencias
  productoId:    ObjectId,  // ref Producto
  varianteId:    String,    // coincide con variante.varianteId

  // Snapshot inmutable
  productoSnapshot: { nombre, modelo, sku },
  varianteSnapshot: { color, colorSecundario, talla },

  // Datos del lote de compra/ingreso
  tipo:                 "COMPRA" | "AJUSTE_COSTO" | "DEVOLUCION_PROVEEDOR",
  cantidadIngresada:    Number,  // unidades que ingresaron en este lote
  costoUnitarioOrigen:  Number,  // costo en moneda origen (ej: S/ 12.50)
  monedaOrigen:         String,  // "PEN", "USD", etc.
  tipoCambio:           Number,  // tipo de cambio aplicado (ej: 0.52 BOB/PEN)
  costoUnitarioLocal:   Number,  // costoUnitarioOrigen * tipoCambio (en BOB)

  // CPP resultante DESPUÉS de este ingreso
  stockAntesIngreso:    Number,  // stock en unidades antes de este lote
  costoCppAntes:        Number,  // CPP vigente antes de este lote (BOB)
  stockDespuesIngreso:  Number,  // stock después de este lote
  costoCppDespues:      Number,  // nuevo CPP calculado (BOB) <- se copia a variante.precioCosto

  // Trazabilidad
  referencia:     String,    // ej: número de factura, orden de compra
  notas:          String,
  registradoPor:  ObjectId,  // ref User
  createdAt:      Date,
}
```

#### Fórmula CPP

```
CPP_nuevo = (stock_anterior * CPP_anterior + cantidad_ingresada * costo_unitario_local)
            ─────────────────────────────────────────────────────────────────────────────
                           stock_anterior + cantidad_ingresada
```

Donde `costo_unitario_local = costoUnitarioOrigen × tipoCambio`.

Después de calcular el nuevo CPP, se actualiza `variante.precioCosto = CPP_nuevo` en el documento `Producto`.

---

### 2.4 Cambios al modelo `Inventario` (existente)

El modelo de movimientos de stock ya existente **no se elimina**. Se extiende con campos opcionales:

```typescript
// Campos opcionales a agregar al inventarioSchema
costoUnitarioLocal: Number,   // costo en BOB de esta unidad (CPP vigente al momento)
referenciaMovCosto: ObjectId  // ref MovimientoCosto — si aplica
```

> **Nota:** `MovimientoCosto` es la fuente de verdad para el costo; `Inventario` sigue siendo la fuente de verdad para las cantidades.

---

### 2.5 Resumen: Antes vs Después del modelo de datos

| Aspecto | Antes | Después |
|---|---|---|
| Dónde vive `precioVenta` | `Producto` (único para todas las variantes) | `Variante.precioVenta` (por variante) + `Producto.precioVenta` como fallback |
| Dónde vive `precioCosto` | `Producto` (único, estático) | `Variante.precioCosto` = CPP dinámico en BOB |
| Historia de compras | No existe | Nueva colección `MovimientoCosto` |
| Tipo de cambio | No se registra | `MovimientoCosto.tipoCambio` por lote |
| Moneda de compra | No se registra | `MovimientoCosto.monedaOrigen` |
| Cálculo de ganancia en pedido | `(precioVenta - precioCosto) * qty` del producto padre | `(variante.precioVenta - variante.precioCosto) * qty` de la variante |
| Validación precio > costo | A nivel producto | A nivel variante, en el schema Zod |

---

## 3. Impacto en el resto del sistema

### 3.1 Archivos de servicio que leen precio/costo del producto padre

| Archivo | Línea(s) | Qué hace hoy | Qué debe hacer |
|---|---|---|---|
| `cart.service.ts` | 97, 122, 124, 175-176 | `producto.precioVenta` → carrito | `variante.precioVenta ?? producto.precioVenta` |
| `cart.service.ts` | 274-275 | `producto.precioVenta` → checkout | `variante.precioVenta ?? producto.precioVenta` |
| `pedidos.service.ts` | 284, 304 | `producto.precioCosto` → ganancia en checkout | `variante.precioCosto` (CPP vigente) |
| `pedidos.service.ts` | 407, 409, 433 | `producto.precioVenta/precioCosto` → venta directa POS | `variante.precioVenta/precioCosto` |
| `catalog.service.ts` | 330 | `producto.precioVenta` → scan POS | `variante.precioVenta ?? producto.precioVenta` |

### 3.2 Schemas de validación Zod a modificar

| Archivo | Cambio necesario |
|---|---|
| `producto.schema.ts` | Agregar `precioVenta` y `precioCosto` opcionales dentro de `varianteSchema`; mantener los del nivel raíz como fallback; ajustar el `refine` de precio > costo por variante |
| `inventario.schema.ts` | Agregar campos opcionales: `costoUnitarioOrigen`, `monedaOrigen`, `tipoCambio` |
| `movimientoCosto.schema.ts` | **NUEVO** — Schema Zod completo para registrar un lote de compra con TC |

### 3.3 Tipos TypeScript a modificar

| Archivo | Cambio |
|---|---|
| `src/types/producto.ts` | Agregar `precioVenta?: number` y `precioCosto?: number` a la interfaz `Variante` |
| `src/types/movimientoCosto.ts` | **NUEVO** — Interfaz `MovimientoCosto` completa |

### 3.4 Módulos de negocio afectados

| Módulo | Impacto | Criticidad |
|---|---|---|
| **Carrito** (`cart.service.ts`) | Lee `precioVenta` del producto padre en 4 lugares | 🔴 Alta |
| **Pedidos** (`pedidos.service.ts`) | Lee `precioCosto` y `precioVenta` del padre en checkout y venta directa | 🔴 Alta |
| **POS** (`pos.service.ts`) | Llama a `crearVentaDirecta` que usa el padre (impacto indirecto) | 🔴 Alta |
| **Catálogo** (`catalog.service.ts`) | `findCatalogProductByCode` retorna `precioVenta` del padre | 🔴 Alta |
| **Inventario** (`inventory.service.ts`) | No registra costo en movimientos — agregar lógica CPP | 🟡 Media |
| **Reportes** (`reports.service.ts`) | `gananciaTotal` deriva del pedido; correcto después de fix upstream | 🟡 Media |
| **Creación de producto** (`catalog.service.ts`) | `createCatalogProduct` no propaga precio/costo a variantes | 🟡 Media |
| **Public catalog** (`PUBLIC_PRODUCT_PROJECTION`) | Excluye `precioCosto` del padre; deberá excluir también `variante.precioCosto` | 🟢 Baja |

### 3.5 Frontend / Dashboard

Los componentes del dashboard que actualmente muestran `precioVenta` y `precioCosto` del producto padre necesitarán actualización de UI para permitir editar estos valores por variante. Esto es fuera del alcance del backend, pero debe coordinarse.

---

## 4. Estrategia de migración sin downtime

### 4.1 Principio general: Expand-Contract

```
Fase 1 (EXPAND)   → Agregar campos nuevos sin eliminar los viejos.
                    El sistema lee los viejos y escribe en ambos.
Fase 2 (MIGRATE)  → Script que pobla los campos nuevos con datos existentes.
Fase 3 (CONTRACT) → El sistema lee solo los nuevos; los viejos quedan deprecated.
Fase 4 (CLEANUP)  → Eliminar campos viejos del modelo.
```

### 4.2 Script de migración de datos existentes

El script de migración (a correr una única vez en producción) debe:

1. **Iterar todos los documentos `Producto`** usando cursor (sin cargar todo en RAM).
2. Para cada variante de cada producto:
   - Asignar `variante.precioVenta = producto.precioVenta` si aún no tiene valor.
   - Asignar `variante.precioCosto = producto.precioCosto` si aún no tiene valor.
3. **No crear** `MovimientoCosto` históricos (no hay datos de TC recuperables).
4. Validar que ningún `variante.precioCosto` quede en `null` o `0`.
5. Imprimir resumen al final (productos procesados, variantes migradas).

> **Punto de partida explícito:** Todos los productos existentes quedan con el mismo precio/costo que tenían a nivel padre. Los siguientes ingresos de stock ya pasarán por el nuevo flujo CPP.

### 4.3 Plan de rollback

| Evento | Acción de rollback |
|---|---|
| Error en el script de migración | El script debe ser **idempotente** (solo escribe si el campo es nulo). Los campos viejos (`producto.precioVenta`, `producto.precioCosto`) nunca se eliminan en Fase 1. Revertir el deploy es suficiente. |
| Bug en la lógica CPP post-migración | Durante Fases 1-2, el sistema puede volver al fallback `producto.precioVenta` con un feature flag. |
| Error grave en producción después de Fase 3 | Restaurar backup de MongoDB previo al deploy. La migración debe ejecutarse en ventana corta (< 5 minutos). |

### 4.4 Consideraciones sobre downtime

- **Fases 1 y 2:** Completamente sin downtime (campos aditivos, lectura con fallback).
- **Migración de datos:** Puede ejecutarse con el servidor activo. Opera documento por documento con operaciones atómicas de MongoDB ($set sobre campos nuevos).
- **Fase 3:** Requiere un deploy coordinado, pero no downtime gracias al fallback `??` y al patrón rolling deployment de Next.js/Vercel.

---

## 5. Fases de implementación

### Fase 1 — Modelo de datos y CPP core

**Objetivo:** Agregar los nuevos campos al esquema de MongoDB y crear la colección `MovimientoCosto`.

**Entregables concretos:**
- [ ] `src/models/producto.ts`: agregar `precioVenta`, `precioCosto` y `monedaCompra` a `varianteSchema` (opcionales, `min: 0`).
- [ ] `src/types/producto.ts`: agregar los campos a la interfaz `Variante`.
- [ ] `src/models/movimientoCosto.ts`: **NUEVO** modelo Mongoose completo (ver §2.3).
- [ ] `src/types/movimientoCosto.ts`: **NUEVO** interfaz TypeScript.
- [ ] `src/schemas/movimientoCosto.schema.ts`: **NUEVO** schema Zod para validar entrada de lote de compra.
- [ ] `src/schemas/producto.schema.ts`: agregar `precioVenta`/`precioCosto` opcionales en `varianteSchema`.

**Criterio de aceptación:** El sistema compila y arranca sin errores. Los campos nuevos existen en el schema pero no se usan aún en la lógica de negocio.

---

### Fase 2 — Script de migración de datos

**Objetivo:** Poblar `variante.precioVenta` y `variante.precioCosto` para todos los documentos existentes.

**Entregables concretos:**
- [ ] `scripts/migrar-precio-por-variante.ts`: script standalone que:
  - Conecta a MongoDB.
  - Itera todos los `Producto` con cursor.
  - Para cada variante sin precio/costo propio, asigna los del producto padre.
  - Imprime resumen al final.
- [ ] Ejecutar el script en staging clonado de producción.
- [ ] Verificar con query de auditoría que no hay variantes con campos nulos.

**Criterio de aceptación:** 100% de las variantes tienen `precioVenta` y `precioCosto` no nulos. El script es idempotente (se puede ejecutar múltiples veces con el mismo resultado).

---

### Fase 3 — Lógica de servicio: lectura desde variante + CPP

**Objetivo:** El sistema empieza a leer precio/costo desde la variante y a registrar movimientos de costo.

#### 3a — Lectura de precio/costo desde variante (con fallback)

- [ ] `cart.service.ts` (líneas 97, 122, 124, 175-176, 274-275): reemplazar `producto.precioVenta` por `variante.precioVenta ?? producto.precioVenta`.
- [ ] `pedidos.service.ts` (línea 284, 304): reemplazar `producto.precioCosto` por `variante.precioCosto ?? producto.precioCosto`.
- [ ] `pedidos.service.ts` (líneas 407, 409, 433): reemplazar precio y costo en venta directa POS.
- [ ] `catalog.service.ts` (línea 330): incluir `precioVenta` de la variante en la respuesta del scan.

#### 3b — Nuevo endpoint para registrar ingresos de stock con costo

- [ ] Crear `src/modules/compras/application/compras.service.ts` con función `registrarIngresoConCosto(input)` que:
  1. Valida los datos de entrada.
  2. Calcula el nuevo CPP usando la fórmula de §2.3.
  3. **En una sola transacción MongoDB:**
     - Crea documento `MovimientoCosto`.
     - Actualiza `variante.precioCosto` en el `Producto`.
     - Registra movimiento de stock en `Inventario` (tipo ENTRADA) con `costoUnitarioLocal`.
  4. Registra evento de auditoría.
- [ ] Crear `src/app/api/compras/route.ts`: `POST /api/compras` (solo ADMIN).

#### 3c — Validaciones en schemas

- [ ] `createProductoSchema`: validar `precioVenta > precioCosto` a nivel de variante cuando ambos están presentes.
- [ ] `updateProductoSchema`: igual validación.

**Criterio de aceptación:** Se puede crear un ingreso de stock con TC y el CPP se recalcula correctamente. Los pedidos nuevos usan el costo de la variante en el cálculo de ganancia.

---

### Fase 4 — UI y reportes

**Objetivo:** El dashboard refleja precio/costo por variante y los reportes muestran ganancia basada en CPP.

**Entregables concretos:**
- [ ] Formulario de creación/edición de producto: agregar campos de precio y costo por variante en la UI.
- [ ] Pantalla de inventario: nueva sección "Ingresos de compra" con formulario que use el nuevo endpoint.
- [ ] Reporte de valorización de inventario: `stock × CPP vigente = valor total del inventario`.
- [ ] Exportación de historial de `MovimientoCosto` por variante.
- [ ] Alerta visual en el producto/variante cuando `precioVenta < precioCosto` (margen negativo).

**Criterio de aceptación:** Un admin puede ingresar un lote de compra con tipo de cambio y ver el nuevo CPP reflejado en la ficha del producto.

---

### Fase 5 — Limpieza (Cleanup)

**Objetivo:** Eliminar el código que usa los campos deprecados del producto padre.

**Entregables concretos:**
- [ ] Remover el fallback `?? producto.precioVenta` en todos los servicios (la variante SIEMPRE tiene el campo en este punto).
- [ ] Decidir y documentar si `Producto.precioVenta` y `Producto.precioCosto` se eliminan o se mantienen como "precio sugerido".
- [ ] Actualizar `API_DOCUMENTACION.md` con los nuevos endpoints y el modelo actualizado.

---

### Timeline sugerido

| Fase | Estimado | Dependencia |
|---|---|---|
| Fase 1 — Modelos | 1-2 días | — |
| Fase 2 — Migración de datos | 1 día | Fase 1 completa |
| Fase 3 — Lógica de servicio | 3-5 días | Fase 2 completa |
| Fase 4 — UI y reportes | 3-5 días | Fase 3a completa |
| Fase 5 — Limpieza | 1 día | Fases 3 y 4 completas y estables |

---

## 6. Riesgos y puntos abiertos

### 6.1 Decisiones que el desarrollador debe tomar ANTES de implementar

> **[DECISIÓN 1] — ¿Qué rol tiene `Producto.precioVenta` después de la migración?**

Opciones:
- **A) Precio por defecto** para variantes que no tengan precio propio (fallback permanente).
- **B) Solo histórico/deprecated**, eliminado en Fase 5.
- **C) "Precio sugerido"** editable por el admin, que se puede sobreescribir por variante.

La opción C es la más flexible pero agrega complejidad de UI. La opción A es la más simple para la transición.

---

> **[DECISIÓN 2] — ¿Los reportes de ganancia histórica deben recalcularse?**

Los pedidos históricos tienen `precioCosto` congelado al momento de la venta (snapshot). ¿Los reportes de ganancia histórica deben seguir usando ese snapshot, o deben recalcularse con el CPP actual?

**Recomendación:** Mantener el snapshot del pedido como fuente de verdad para ganancia histórica. El CPP nuevo solo aplica a ventas futuras.

---

> **[DECISIÓN 3] — ¿Qué pasa con el precio de venta cuando sube el CPP?**

Si el CPP de una variante sube (ej: el tipo de cambio subió), ¿debe el sistema:
- **A)** Solo notificar al admin que el margen cayó (alerta si `precioVenta < precioCosto`).
- **B)** Actualizar automáticamente el `precioVenta` (riesgoso: clientes ven precio diferente sin previo aviso).
- **C)** Bloquear nuevas ventas hasta que el admin confirme el nuevo precio.

**Recomendación:** Opción A es la más segura para el negocio.

---

> **[DECISIÓN 4] — ¿El endpoint de compras es independiente del ajuste de inventario actual?**

Hoy existe `POST /api/inventario` para ajustar stock manualmente. ¿Debe:
- **Opción A:** Un solo endpoint `POST /api/inventario` con campos opcionales de costo. Si los campos de costo están presentes, ejecuta el CPP.
- **Opción B:** Dos endpoints separados: `POST /api/inventario` (ajuste sin costo) y `POST /api/compras` (ingreso con costo y TC).

**Recomendación:** Opción B. Semánticamente son operaciones diferentes y facilita el control de permisos y auditoría.

---

> **[DECISIÓN 5] — ¿Cuántas monedas de origen se deben soportar?**

El enunciado menciona soles (PEN) → bolivianos (BOB). ¿El sistema debe soportar múltiples monedas de origen (USD, EUR, etc.) o solo PEN por ahora?

**Recomendación:** Diseñar el campo `monedaOrigen` como string libre desde el inicio (ej: `"PEN"`, `"USD"`) para no limitar el sistema. La UI puede solo exponer PEN en primera instancia.

---

> **[DECISIÓN 6] — ¿Se intentan migrar los movimientos de ENTRADA históricos como `MovimientoCosto`?**

Los registros actuales en `Inventario` con `tipo: "ENTRADA"` no tienen información de tipo de cambio. No es posible reconstruir el CPP histórico.

**Recomendación:** No retroalimentar el historial. El historial de `MovimientoCosto` empieza desde el primer ingreso real post-migración. El CPP inicial = `precioCosto` del producto padre.

---

> **[DECISIÓN 7] — ¿Qué pasa con variantes que ya tienen ventas históricas en `Pedido`?**

Los pedidos históricos tienen snapshots con `precioCosto = producto.precioCosto` (del padre). Esos pedidos viejos seguirán mostrando el costo antiguo en reportes, que es el comportamiento deseado.

No hay riesgo directo con la migración. El único punto a vigilar es que si se elimina una variante con ventas históricas, sus snapshots en `Pedido` quedan huérfanos (pero ese riesgo existe hoy y no es nuevo).

---

### 6.2 Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Script de migración interrumpido a mitad | Baja | Medio | Script idempotente: solo escribe si el campo es nulo (`$set` condicional con `$cond`) |
| CPP calculado incorrectamente (división por cero) | Media | Alto | Validar `stockAntesIngreso + cantidadIngresada > 0` antes de dividir |
| `precioVenta` de variante queda por debajo del CPP sin que nadie lo note | Media | Alto | Agregar alerta en el sistema cuando `precioVenta < precioCosto` por variante |
| Inconsistencia entre `variante.precioCosto` y `MovimientoCosto.costoCppDespues` | Baja | Medio | Actualizar ambos en la misma transacción MongoDB |
| Reportes de ganancia incorrectos durante Fase 3 | Media | Medio | Los reportes usan `gananciaTotal` del pedido; pedidos anteriores no cambian; pedidos nuevos ya usan la variante |
| Colisión de actualizaciones concurrentes del CPP de una misma variante | Baja | Medio | Usar `findOneAndUpdate` atómico o serializar con lock de variante |

---

## 7. Resumen ejecutivo

El sistema actual tiene **una sola fuente de precio y costo a nivel de producto padre**, heredada de forma opaca por todas sus variantes. Esto impide:

- Diferenciar precios/costos entre tallas o colores del mismo producto.
- Reflejar cambios en el tipo de cambio sin sobreescribir el historial de costos.
- Tener trazabilidad de compras por variante.

La solución propuesta introduce tres cambios fundamentales:

1. **Mover precio y costo al nivel de variante** — manteniendo el del producto padre como fallback durante la transición (patrón Expand-Contract).
2. **Crear la colección `MovimientoCosto`** — para registrar cada lote de compra con moneda origen, tipo de cambio y costo unitario resultante en BOB.
3. **Calcular el CPP automáticamente en cada ingreso de stock** — y actualizar `variante.precioCosto` con el nuevo valor, en la misma transacción que crea el movimiento de inventario.

La migración es **incremental y sin downtime**. Los datos existentes se inicializan desde el valor actual del producto padre como punto de partida neutral.

**El mayor riesgo identificado no es técnico sino de decisión de negocio:** ¿qué sucede con el `precioVenta` cuando el CPP sube? Se recomienda implementar alertas (Decisión 3-A) como primer paso, antes de cualquier mecanismo automático de ajuste de precios.
