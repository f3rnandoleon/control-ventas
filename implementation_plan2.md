# Mejoras al Panel de Administración: Productos y Ventas

Plan de implementación revisado y priorizado por consistencia de dominio, mantenibilidad, rendimiento y experiencia de usuario.

## Objetivo y alcance

Mejorar las pantallas administrativas de Productos y Ventas mediante:

- Filtros útiles y consistentes.
- Miniaturas de productos.
- Reportes de stock en PDF.
- Vista previa visual de colores.
- Paginación y filtros de ventas desde el servidor.

El alcance principal es la aplicación web Next.js. No se modifica el checkout, la autenticación ni el registro de ventas POS. Sí se requieren ajustes acotados en las API de productos y ventas para entregar información correcta y escalable.

---

## Decisiones de dominio

### Stock

- No se usará un umbral fijo de `2`.
- Cada producto conservará su `stockMinimo`; actualmente el modelo usa `5` por defecto.
- Se distinguirán estos valores:
  - **Stock físico**: suma de `variante.stock`.
  - **Stock reservado**: suma de `variante.stockReservado`.
  - **Stock disponible**: `max(stock físico - stock reservado, 0)`.
- Los filtros y estados comerciales usarán **stock disponible**:
  - `stockDisponible === 0` → Sin stock.
  - `stockDisponible > 0 && stockDisponible <= stockMinimo` → Bajo stock.
  - `stockDisponible > stockMinimo` → En stock.
- Los reportes mostrarán stock físico, reservado y disponible para evitar ambigüedad.
- La regla se implementará una sola vez en una utilidad compartida; no se duplicará en componentes.

### Reportes

- Solo se exportará PDF; no se requiere Excel.
- El reporte general exportará los productos que coincidan con los filtros activos.
- El reporte individual mostrará datos actuales del producto y sus variantes; **no mostrará historial de movimientos**.
- Para tablas PDF se instalará `jspdf-autotable`. `jspdf` por sí solo no resuelve de forma robusta anchos, textos largos, encabezados repetidos y saltos de página.
- Se probarán caracteres españoles, textos extensos y documentos de varias páginas.

### Ventas

- La paginación y los filtros se resolverán en servidor/BD, no mediante `slice()` en el navegador.
- “Cliente” y “Vendedor” serán filtros separados.
- Las fechas se interpretarán en la zona horaria de negocio `America/La_Paz` y el día final será inclusivo.

### Colores

- Se ampliará el catálogo evitando sinónimos o duplicados como `Verde Oliva`/`Olivo` y `Vino`/`Borgoña`/`Burdeos` sin una decisión explícita.
- Opciones y hexadecimal vivirán en una única estructura para evitar desincronización.
- El hexadecimal será una referencia visual, no una representación exacta de la prenda.

---

## Fase 1: Reglas y utilidades compartidas

### [NEW] `src/utils/stock.ts`

- Funciones puras para calcular:
  - Stock físico por variante y producto.
  - Stock reservado.
  - Stock disponible.
  - Estado `EN_STOCK | BAJO_STOCK | SIN_STOCK` usando `stockMinimo`.
- Proteger contra valores ausentes o negativos mediante normalización.
- Reutilizar estas funciones en Productos, reportes y, cuando corresponda, Inventario.

### [MODIFY] `src/types/producto.ts`

- Agregar a `Producto`:
  - `stockTotal?: number`.
  - `stockMinimo?: number`.
  - `estado?: "ACTIVO" | "INACTIVO" | "AGOTADO"`.
  - Campos calculados opcionales si la API los entrega: `stockReservadoTotal?` y `stockDisponible?`.
- Mantener `stockReservado?: number` en cada variante.

### [MODIFY] `src/services/producto.service.ts`

- Permitir solicitar stock calculado de forma explícita:

```ts
getProductos({ withStock: true })
```

- La pantalla administrativa de Productos usará `/api/productos?withStock=true`.
- Conservar el comportamiento actual para consumidores que no necesiten datos ampliados.

### [REVIEW/MODIFY] cálculo de `stockTotal`

Archivos involucrados:

- `src/models/producto.ts`.
- `src/modules/catalog/application/catalog.service.ts`.
- `src/modules/catalog/infrastructure/catalog.repository.ts`.

El middleware `pre("save")` no garantiza recalcular `stockTotal` cuando se usa `findByIdAndUpdate()`. Se debe elegir una fuente de verdad:

1. Recomendado: calcular los totales desde variantes al construir la respuesta con `withStock=true` y no confiar en un valor persistido potencialmente obsoleto.
2. Complementario: recalcular y persistir `stockTotal` dentro de toda operación que modifique variantes.

No se realizará una migración de BD salvo que una auditoría confirme valores históricos incorrectos y se decida corregirlos.

### [MODIFY] `src/constants/variant-options.ts`

- Reemplazar la lista de strings y el mapa separado por una única colección:

```ts
type ColorOption = {
  value: string;
  label: string;
  hex: string;
};
```

- Mantener compatibilidad con colores ya guardados como texto.
- Normalizar etiquetas, tildes y duplicados antes de añadir nuevos colores.
- Colores candidatos: Terracota, Lavanda, Salmón, Aguamarina, Menta, Carbón, Marfil, Índigo, Cian, Bronce, Cobre, Hueso, Chocolate, Cereza, Ciruela, Petróleo, Arena y Ámbar.
- Añadir Olivo o Borgoña solo si sustituyen o se diferencian deliberadamente de opciones existentes.

### [NEW] `src/components/ui/ColorSwatch.tsx`

- Props: `colorName`, `size?: "sm" | "md"`, `shape?: "circle" | "square"`.
- Mostrar borde visible para colores claros.
- Incluir `title` y etiqueta accesible; el color no será el único medio de comunicación.
- Fallback gris con `?` para valores históricos no reconocidos.

### [NEW] `src/components/ui/Pagination.tsx`

- Componente controlado y reutilizable.
- Props: `currentPage`, `totalPages`, `pageSize`, `pageSizeOptions`, `onPageChange`, `onPageSizeChange`, `totalItems`, `disabled?`.
- Opciones iniciales: 10, 25 y 50.
- Soportar páginas vacías, una sola página y estado de carga.
- Restablecer a página 1 cuando cambien filtros o tamaño de página.

---

## Fase 2: Reportes PDF

### [DEPENDENCY] `jspdf-autotable`

- Instalar una versión compatible con el `jspdf` existente.
- No instalar `xlsx`.

### [NEW] `src/utils/reportes/pdfHelpers.ts`

- Configuración común de documento, fecha, título, moneda y nombre de archivo.
- Encabezados repetidos y numeración de páginas.
- Formateo seguro de textos y valores ausentes.

### [NEW] `src/utils/reportes/generarReporteStock.ts`

- `generarReporteStockPDF(productos: Producto[]): void`.
- Columnas sugeridas: Nombre, Modelo, SKU, Categoría, Precio de venta, Stock físico, Reservado, Disponible y Estado de stock.
- Usar la regla compartida de `src/utils/stock.ts`.
- Incluir fecha/hora de generación y aclarar que refleja el estado actual.
- No generar un documento vacío: el botón se deshabilitará o se mostrará un aviso.

### [NEW] `src/utils/reportes/generarReporteProducto.ts`

- `generarReporteProductoPDF(producto: Producto): void`.
- Incluir datos generales y tabla de variantes.
- Columnas: Color principal, Color secundario, Talla, Stock físico, Reservado, Disponible y Estado.
- No consultar ni afirmar que contiene movimientos de inventario.

---

## Fase 3: Página de Productos

### [NEW] `src/components/productos/ProductoFilters.tsx`

- Filtros:
  - Categoría.
  - Precio mínimo y máximo sobre `precioVenta`.
  - Estado de stock disponible.
- Botón “Limpiar filtros”.
- Validar que mínimo y máximo sean números no negativos y que mínimo no supere máximo.
- Categorías derivadas de los productos cargados:
  - Aplicar `trim()`.
  - Excluir vacías.
  - Deduplicar sin distinguir mayúsculas/minúsculas.
  - Ordenar para una presentación estable.

### [MODIFY] `src/app/dashboard/admin/productos/page.tsx`

- Cargar productos mediante `getProductos({ withStock: true })`.
- Combinar búsqueda textual con filtros estructurados.
- Agregar columna “Imagen” como primera columna.
- Obtener la portada mediante la utilidad existente de imagen principal de variante, contemplando `imagenes` e `imagen` históricos.
- Mostrar miniatura de 40×40 px con `CloudinaryImage`; usar placeholder reutilizable si no existe imagen.
- Agregar “Generar reporte” indicando que exporta los resultados filtrados.
- Deshabilitar el reporte cuando no existan resultados.
- Agregar “Reporte individual” en las acciones de cada producto.
- Actualizar `colSpan` de 5 a 6.
- Mostrar errores de carga, eliminación y generación mediante feedback visible.
- Conservar funcionamiento en tema claro, oscuro y ancho móvil.

### [MODIFY] `src/components/productos/VarianteForm.tsx`

- Mostrar `ColorSwatch` junto a color principal y secundario.
- Mantener selects accesibles y layout responsive.
- Los colores nuevos provendrán automáticamente del catálogo centralizado.

---

## Fase 4: API de ventas con filtros y paginación

### Contrato propuesto

```text
GET /api/pedidos?scope=sales&page=1&limit=25&from=YYYY-MM-DD&to=YYYY-MM-DD&customer=...&seller=...&paymentMethod=EFECTIVO|QR
```

Respuesta:

```ts
type PaginatedSalesResponse = {
  items: Pedido[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
```

### [NEW] esquema de query de ventas

- Validar con Zod:
  - `page >= 1`.
  - `limit` permitido: 10, 25 o 50.
  - Fechas válidas.
  - Método de pago permitido.
  - Longitud máxima de textos de búsqueda.
- Convertir rango local `America/La_Paz` a límites UTC antes de consultar MongoDB.
- “Hasta” debe incluir el día completo usando preferentemente un límite exclusivo al inicio del día siguiente.

### [MODIFY] `src/app/api/pedidos/route.ts`

- Leer y validar parámetros cuando `scope=sales`.
- Mantener autorización actual: administrador ve ventas reconocidas globales; vendedor solo las propias.
- Devolver respuesta paginada para el scope de ventas.
- Definir una transición compatible si otros consumidores esperan actualmente un array.

### [MODIFY] `src/modules/orders/infrastructure/pedidos.repository.ts`

- Ampliar `listRecognizedSales()` y `listRecognizedSalesBySeller()` con filtros, `skip`, `limit` y orden estable `createdAt: -1`.
- Ejecutar `countDocuments()` con exactamente el mismo filtro usado para obtener items.
- Mantener siempre `buildRecognizedSalesMatch()` para excluir pedidos no reconocidos o cancelados.
- Escapar el texto de búsquedas antes de construir expresiones regulares.
- Buscar cliente en `snapshotCliente.nombreCompleto` y/o referencia poblada según el modelo real.
- Buscar vendedor por su identificador o mediante una estrategia definida; no mezclarlo con el campo Cliente.
- Evaluar índices de fecha, método de pago y campos usados con frecuencia después de medir consultas reales.

### [MODIFY] `src/modules/orders/application/pedidos.service.ts`

- Recibir filtros validados.
- Aplicar alcance según el rol autenticado.
- Retornar `items`, metadatos y total.

### [MODIFY] `src/services/pedidos.service.ts`

- Cambiar `getVentas()` para recibir filtros y devolver `PaginatedSalesResponse`.
- Serializar únicamente parámetros definidos.
- Manejar mensajes de error de la API.

---

## Fase 5: Página de Ventas

### [NEW] `src/components/ventas/VentaFilters.tsx`

- Filtros:
  - Desde.
  - Hasta.
  - Cliente.
  - Vendedor.
  - Método de pago: Todos, Efectivo y QR.
- Botón “Limpiar filtros”.
- Aplicar un debounce breve a búsquedas de texto para no consultar en cada pulsación.
- No mezclar vendedor y cliente bajo una misma etiqueta.

### [MODIFY] `src/app/dashboard/admin/ventas/page.tsx`

- Separar visualmente “Registrar venta” e “Historial de ventas”.
- Colocar `VentaFilters` inmediatamente encima del historial, no encima de `VentaPOS`.
- Mantener en el padre filtros, página, tamaño de página, carga y respuesta paginada.
- Volver a página 1 al cambiar filtros o tamaño.
- Recargar la página correspondiente después de registrar una venta.
- Evitar que una respuesta lenta anterior sobrescriba filtros más recientes.
- Mostrar errores y estado vacío diferenciando “sin ventas” de “sin coincidencias”.

### [MODIFY] `src/components/ventas/VentaTable.tsx`

- Recibir solamente los items de la página actual y los metadatos de paginación.
- No ejecutar `slice()`.
- Integrar `Pagination` debajo de la tabla.
- Mostrar “Mostrando X–Y de Z ventas”.
- Soportar cliente o vendedor ausente con textos explícitos, por ejemplo “Venta mostrador” y “Sin vendedor”.

---

## Resumen de archivos

| Acción | Archivo | Fase |
|---|---|---:|
| NEW | `src/utils/stock.ts` | 1 |
| MODIFY | `src/types/producto.ts` | 1 |
| MODIFY | `src/services/producto.service.ts` | 1 |
| REVIEW/MODIFY | `src/models/producto.ts` | 1 |
| REVIEW/MODIFY | `src/modules/catalog/application/catalog.service.ts` | 1 |
| MODIFY | `src/constants/variant-options.ts` | 1 |
| NEW | `src/components/ui/ColorSwatch.tsx` | 1 |
| NEW | `src/components/ui/Pagination.tsx` | 1 |
| DEPENDENCY | `jspdf-autotable` | 2 |
| NEW | `src/utils/reportes/pdfHelpers.ts` | 2 |
| NEW | `src/utils/reportes/generarReporteStock.ts` | 2 |
| NEW | `src/utils/reportes/generarReporteProducto.ts` | 2 |
| NEW | `src/components/productos/ProductoFilters.tsx` | 3 |
| MODIFY | `src/app/dashboard/admin/productos/page.tsx` | 3 |
| MODIFY | `src/components/productos/VarianteForm.tsx` | 3 |
| MODIFY | `src/app/api/pedidos/route.ts` | 4 |
| MODIFY | `src/modules/orders/infrastructure/pedidos.repository.ts` | 4 |
| MODIFY | `src/modules/orders/application/pedidos.service.ts` | 4 |
| MODIFY | `src/services/pedidos.service.ts` | 4 |
| NEW | `src/components/ventas/VentaFilters.tsx` | 5 |
| MODIFY | `src/app/dashboard/admin/ventas/page.tsx` | 5 |
| MODIFY | `src/components/ventas/VentaTable.tsx` | 5 |

---

## Cambios de backend y base de datos

### Backend requerido

- Productos: solicitar y calcular stock ampliado con `withStock=true`.
- Ventas: añadir filtros, conteo y paginación server-side.
- Mantener las reglas actuales de autorización y ventas reconocidas.

### Base de datos

- No se requiere cambiar inmediatamente el esquema de Producto.
- No se requiere usar el historial de Inventario para los reportes definidos.
- Antes de añadir índices se medirán las consultas reales.
- Si se detecta `stockTotal` histórico desactualizado, se preparará una migración separada, idempotente y respaldada; no se mezclará silenciosamente con esta mejora UI.

---

## Verificación

### Automatizada

- Ejecutar `npm run lint`.
- Ejecutar `npm run build` al finalizar cada fase integrable.
- Añadir pruebas unitarias para estado de stock:
  - Stock disponible 0.
  - Igual a `stockMinimo`.
  - Superior a `stockMinimo`.
  - Stock reservado parcial y total.
- Añadir pruebas de query de ventas:
  - Paginación y conteo coherentes.
  - Rol administrador y vendedor.
  - Método de pago.
  - Día final inclusivo en `America/La_Paz`.
  - Texto con caracteres especiales.

### Manual

- Productos sin variantes, sin imagen y sin categoría.
- Categorías duplicadas por espacios o mayúsculas.
- Combinación de búsqueda, categoría, precio y stock.
- Reporte general vacío, filtrado y de varias páginas.
- Reporte individual con muchas variantes y caracteres españoles.
- Swatches de colores claros, oscuros y desconocidos.
- Historial sin ventas y filtros sin coincidencias.
- Ventas sin cliente y/o vendedor poblado.
- Cambio de filtros desde una página mayor a 1.
- Selector de 10, 25 y 50 resultados.
- Tema claro, oscuro y diseño móvil.

---

## Criterios de aceptación

- Productos e Inventario clasifican el stock con la misma regla y el `stockMinimo` del producto.
- Los filtros consideran stock disponible y no reportan como vendibles unidades totalmente reservadas.
- Los PDF reflejan los resultados actuales, tienen saltos de página correctos y no prometen historial de movimientos.
- Las ventas no cargan el historial completo en el navegador.
- Cliente y vendedor se filtran de forma independiente.
- El rango de fechas incluye correctamente todo el día final en Bolivia.
- No se rompen consumidores existentes de las API durante la transición.
- Lint y build finalizan sin errores.

---

## Prioridad recomendada

1. Consistencia de stock y contrato de datos.
2. Paginación/filtros server-side de ventas.
3. Filtros y miniaturas de Productos.
4. Reportes PDF.
5. Ampliación visual del catálogo de colores.

Los colores y swatches aportan experiencia de usuario, pero no deben implementarse antes de resolver la exactitud del stock y la escalabilidad del historial de ventas.
