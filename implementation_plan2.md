# Plan de Implementación: Precios Diferenciados y Medidas por Variante

> **Estado del documento:** Propuesta técnica detallada para revisión previa a la codificación.  
> **Objetivo:** Permitir precio y costo diferenciado por talla/variante y medidas de prenda opcionales, garantizando 100% de retrocompatibilidad, consistencia contable y una interfaz ágil.

---

## 1. Principios de Arquitectura y Dominio

### 1.1 Precios y Costos: Patrón de Sobreescritura con Fallback (*Inheritance Pattern*)
- **Precios Base en Producto:** Se mantienen obligatorios `precioVenta` y `precioCosto` en el modelo `Producto`. Sirven como los precios por defecto para todas las variantes.
- **Sobreescritura Opcional en Variante:** Cada variante en `Producto.variantes` podrá definir de manera opcional `precioVenta?: number` y `precioCosto?: number`.
  - Si una variante omite estos campos (o son `null`/`0`), **hereda automáticamente** los precios base del producto.
  - Si una variante define valores positivos, **sobreescribe** el precio y/o costo exclusivamente para esa variante.
- **Fuente Única de Verdad (*Single Source of Truth*):** Ningún componente ni servicio calculará precios manualmente. Se centralizará en una utilidad `getVariantPricing(producto, variante)` en `src/utils/pricing.ts`.
- **Integridad Financiera:** Las ventas registradas y pedidos históricos se preservan intactos, ya que el sistema ya utiliza snapshots inmutables en `pedidoItemSchema`.

### 1.2 Medidas de Prenda: Subdocumento Tipado Opcional
En lugar de dispersar campos sueltos en la variante, se agrupan en un subdocumento estructurado `medidas`:
- `anchoPecho`: Ancho de axila a axila (cm).
- `anchoHombros`: Ancho de hombro a hombro (cm).
- `largoTotal`: Largo total de la prenda (cm).
- `largoMangaAxila`: Largo de manga desde axila a puño (cm).
- `largoMangaHombro`: Largo de manga desde hombro a puño (cm).

Todas las medidas son numéricas (en centímetros, admiten decimales ej: `54.5`), opcionales y con validación mínima `min: 0`.

---

## 2. Mapa de Archivos e Impacto Transversal

| Componente / Módulo | Archivo(s) | Naturaleza del Cambio |
| :--- | :--- | :--- |
| **Tipos TypeScript** | [`src/types/producto.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/types/producto.ts) | Definir `MedidasPrenda`, extender `Variante` con precios y medidas opcionales. |
| **Modelos Mongoose** | [`src/models/producto.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/models/producto.ts) | Agregar `medidasSchema`, campos `precioVenta` y `precioCosto` en `varianteSchema`. |
| **Esquemas Zod** | [`src/schemas/producto.schema.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/schemas/producto.schema.ts) | Validar campos opcionales en variante y regla de consistencia (`precioVenta > precioCosto`). |
| **Utilidad Central** | [`src/utils/pricing.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/utils/pricing.ts) (NUEVO) | Función canónica `getVariantPricing` y cálculo de rangos de precio de producto. |
| **Servicio de Pedidos** | [`src/modules/orders/application/pedidos.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/orders/application/pedidos.service.ts) | Calcular `precioUnitario`, `precioCosto` y `ganancia` por variante en ventas POS y pedidos web. |
| **Servicio de Carrito** | [`src/modules/cart/application/cart.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/cart/application/cart.service.ts) | Asignar el precio de la variante específica en items del carrito. |
| **Servicio de Catálogo** | [`src/modules/catalog/application/catalog.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/catalog/application/catalog.service.ts) | Entregar rangos de precio (`precioMinimo`, `precioMaximo`) en la ficha de producto. |
| **Integración WhatsApp**| [`src/modules/integrations/whatsapp/whatsapp.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/integrations/whatsapp/whatsapp.service.ts) | Resolver precio unitario según variante seleccionada. |
| **Formulario Variantes**| [`src/components/productos/VarianteForm.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/productos/VarianteForm.tsx) | Inputs opcionales de precio/costo por fila de talla y acordeón colapsable para medidas. |
| **Fila de Variante** | [`src/components/productos/VarianteRow.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/productos/VarianteRow.tsx) | Badges visuales de precio personalizado y modal/popover para consultar medidas. |
| **Punto de Venta (POS)**| [`src/components/ventas/VentaPOS.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/ventas/VentaPOS.tsx) | Calcular subtotales y totales con el precio de la variante seleccionada. |
| **Listado Admin** | [`src/app/dashboard/admin/productos/page.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/app/dashboard/admin/productos/page.tsx) | Mostrar rango de precios si las variantes varían (ej: `Bs 100 - Bs 120`). |

---

## 3. Plan Paso a Paso de Implementación

### Fase 1: Dominio, Schemas y Utilidad Central

#### 1.1 Tipos TypeScript ([`src/types/producto.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/types/producto.ts))
```typescript
export interface MedidasPrenda {
  anchoPecho?: number;       // Axila a axila (cm)
  anchoHombros?: number;     // Hombro a hombro (cm)
  largoTotal?: number;       // Largo total (cm)
  largoMangaAxila?: number;  // Axila a puño/manga (cm)
  largoMangaHombro?: number; // Hombro a puño/manga (cm)
}

export interface Variante {
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
  stock: number;
  stockReservado?: number;
  stockDisponible?: number;
  imagenes?: string[];
  imagen?: string;
  descripcion?: string;
  codigoBarra?: string;
  qrCode?: string;
  precioVenta?: number;      // 🆕 Opcional: sobreescribe Producto.precioVenta
  precioCosto?: number;      // 🆕 Opcional: sobreescribe Producto.precioCosto
  medidas?: MedidasPrenda;   // 🆕 Opcional: medidas en cm
}
```

#### 1.2 Modelo Mongoose ([`src/models/producto.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/models/producto.ts))
- Definir `medidasSchema` con `_id: false` conteniendo los 5 campos tipo `Number` con `min: 0`.
- Extender `varianteSchema`:
  ```typescript
  precioVenta: { type: Number, min: 0 },
  precioCosto: { type: Number, min: 0 },
  medidas: { type: medidasSchema, default: undefined },
  ```

#### 1.3 Esquema de Validación Zod ([`src/schemas/producto.schema.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/schemas/producto.schema.ts))
- Crear `medidasPrendaSchema`:
  ```typescript
  export const medidasPrendaSchema = z.object({
    anchoPecho: positiveNumberSchema.optional(),
    anchoHombros: positiveNumberSchema.optional(),
    largoTotal: positiveNumberSchema.optional(),
    largoMangaAxila: positiveNumberSchema.optional(),
    largoMangaHombro: positiveNumberSchema.optional(),
  }).optional();
  ```
- Extender `varianteSchema` con `precioVenta: positiveNumberSchema.optional()`, `precioCosto: positiveNumberSchema.optional()`, `medidas: medidasPrendaSchema`.
- Agregar refinamiento para variantes: si una variante tiene definidos tanto su propio `precioVenta` como su propio `precioCosto`, validar que `precioVenta >= precioCosto`.

#### 1.4 Utilidad Canónica de Precios ([`src/utils/pricing.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/utils/pricing.ts))
Implementar y exportar:
- `getVariantPricing(producto, variante)`:
  - Devuelve `{ precioVenta, precioCosto, ganancia, tienePrecioDiferenciado }`.
- `getProductPriceRange(producto)`:
  - Calcula el precio mínimo y máximo entre todas las variantes activas del producto.
  - Devuelve `{ precioMinimo, precioMaximo, tieneRango: precioMinimo !== precioMaximo }`.
- `formatProductPriceDisplay(producto)`:
  - Retorna `"Bs 120.00"` si no varía, o `"Bs 100.00 - Bs 120.00"` si varía.

---

### Fase 2: Backend y Lógica de Negocio

#### 2.1 Módulo de Pedidos ([`src/modules/orders/application/pedidos.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/orders/application/pedidos.service.ts))
- **En `createVenta` (Venta Directa / POS):**
  - Reemplazar `const precioUnitario = producto.precioVenta;` por:
    ```typescript
    const pricing = getVariantPricing(producto, variante);
    const precioUnitario = pricing.precioVenta;
    const precioCosto = pricing.precioCosto;
    const totalLinea = precioUnitario * item.cantidad;
    const ganancia = (precioUnitario - precioCosto) * item.cantidad;
    ```
- **En `createPedidoFromCart` (Pedidos Web):**
  - Asegurar que `precioCosto` y `ganancia` utilicen `getVariantPricing(producto, variante)`.

#### 2.2 Módulo de Carrito ([`src/modules/cart/application/cart.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/cart/application/cart.service.ts))
- Al agregar (`addItemToCartByUserId`) o actualizar (`updateCartItemByUserId`):
  - Obtener `pricing = getVariantPricing(producto, variante)`.
  - Asignar `precioUnitario = pricing.precioVenta;` y `subtotal = pricing.precioVenta * cantidad;`.

#### 2.3 Módulo de WhatsApp y Catálogo
- [`whatsapp.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/integrations/whatsapp/whatsapp.service.ts): cotizar y reservar usando el precio exacto de la variante elegida.
- [`catalog.service.ts`](file:///e:/proyectos/control-ropa/control-ventas/src/modules/catalog/application/catalog.service.ts): incluir rangos de precios en respuestas públicas.

---

### Fase 3: Interfaz de Administración de Variantes

#### 3.1 Formulario de Variantes ([`VarianteForm.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/productos/VarianteForm.tsx))
Actualmente, las tallas se administran como filas en `sizeRows`.
- **Evolución del estado de cada fila:**
  ```typescript
  type VarianteTallaForm = {
    varianteId?: string;
    talla: string;
    stock: number;
    codigoBarra?: string;
    qrCode?: string;
    precioVenta?: number | ""; // Vacio = hereda precio base
    precioCosto?: number | ""; // Vacio = hereda costo base
    medidas?: MedidasPrenda;
    showMedidas?: boolean;     // Toggle de UI para acordeón
  };
  ```
- **Diseño visual de cada fila:**
  1. Selector de Talla.
  2. Input de Stock.
  3. Input de `P. Venta (opcional)` con placeholder `Base: Bs {producto.precioVenta}`.
  4. Input de `P. Costo (opcional)` con placeholder `Base: Bs {producto.precioCosto}`.
  5. Botón interactivo: **`📏 Medidas`**
     - Si la fila ya contiene alguna medida rellenada: badge verde `✓ Con medidas`.
     - Al hacer clic: despliega un mini-panel acordeón debajo de la fila con los 5 campos en centímetros:
       - *Pecho (axila a axila)* | *Hombros* | *Largo total* | *Manga (axila)* | *Manga (hombro)*.
  6. Botón para eliminar fila.

#### 3.2 Listado de Variantes ([`VarianteRow.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/productos/VarianteRow.tsx))
- Agregar columna o indicador en la tabla:
  - Si la variante tiene precio personalizado: mostrar `Bs {variante.precioVenta}` con badge `Diferenciado`.
  - Si tiene medidas: botón/icono `📏 Medidas` que abre un popover/tooltip con las 5 medidas en cm para consulta rápida del vendedor/administrador.

---

### Fase 4: Punto de Venta (POS) y Vista de Catálogo

#### 4.1 Punto de Venta ([`VentaPOS.tsx`](file:///e:/proyectos/control-ropa/control-ventas/src/components/ventas/VentaPOS.tsx))
- En el cálculo de `subtotal` (línea 100-103):
  ```typescript
  const subtotal = watchedItems.reduce((sum, item) => {
    const producto = productos.find((p) => p._id === item.productoId);
    if (!producto) return sum;
    const variante = producto.variantes.find((v) => matchesVariant(v, item));
    const pricing = getVariantPricing(producto, variante);
    return sum + pricing.precioVenta * (item.cantidad || 0);
  }, 0);
  ```
- En el selector de variantes del modal de venta: mostrar el precio al lado de la talla si difiere del base (ej: `Talla XL — Bs 140 (Base Bs 120)`).

#### 4.2 Componente "Guía de Tallas" para Detalle de Producto
- Crear un componente reutilizable `GuiaTallasModal.tsx` o tabla incrustada:
  - Lee las variantes del producto.
  - Si al menos una variante tiene medidas, renderiza una tabla comparativa automática:
    | Talla | Pecho (axila-axila) | Hombros | Largo Total | Manga (axila) | Manga (hombro) |
    | :---: | :---: | :---: | :---: | :---: | :---: |
    | S | 50 cm | 42 cm | 66 cm | 48 cm | 60 cm |
    | M | 53 cm | 44 cm | 68 cm | 50 cm | 62 cm |
    | L | 56 cm | 46 cm | 70 cm | 52 cm | 64 cm |
    | XL | 60 cm | 48 cm | 73 cm | 53 cm | 66 cm |

---

## 4. Retrocompatibilidad y Estrategia de Migración

1. **Sin Migración Destructiva:**
   - Como los nuevos campos son opcionales en el esquema de MongoDB, los miles de registros existentes en la colección `productos` siguen funcionando de inmediato sin correr scripts obligatorios.
   - Cualquier variante sin `precioVenta` o `medidas` simplemente asume `precioVenta = producto.precioVenta` mediante el helper `getVariantPricing`.
2. **Validación de Datos en Escritura:**
   - Al editar un producto existente en `VarianteForm`, solo se enviarán `precioVenta`, `precioCosto` o `medidas` si el usuario los completó explícitamente.

---

## 5. Criterios de Aceptación y Pruebas Obligatorias

- [ ] **CA-01 (Herencia por defecto):** Crear un producto con precio base `Bs 100` y costo `Bs 60`. Las variantes S y M sin precio personalizado deben venderse a `Bs 100` con ganancia `Bs 40`.
- [ ] **CA-02 (Sobreescritura por talla):** La variante XL se define con precio `Bs 120` y costo `Bs 75`. En el POS y en pedidos web, al agregar la variante XL, el subtotal debe calcularse a `Bs 120` y la ganancia registrada en la venta debe ser exactamente `Bs 45`.
- [ ] **CA-03 (Medidas opcionales):** Guardar una variante con 2 de las 5 medidas (ej: `anchoPecho: 54` y `largoTotal: 70`). El sistema debe persistirlas en cm y el popover de `VarianteRow` debe mostrarlas correctamente sin requerir las otras 3.
- [ ] **CA-04 (Venta POS en vivo):** Agregar al carrito del POS una talla M (`Bs 100`) y una XL (`Bs 120`). El subtotal debe sumar exactamente `Bs 220`. Al emitir el ticket de venta, cada línea debe conservar su precio unitario específico.
- [ ] **CA-05 (Catálogo con rangos):** Un producto con precios diferenciados debe mostrar en el listado administrativo y en el catálogo comercial el rango `Bs 100.00 - Bs 120.00`.
