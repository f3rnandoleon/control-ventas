# Reporte Detallado de Cambios (Desde commit `16d043b` hasta `c5f8e2b`)

**Rango de Commits:** `16d043b` (excluido) $\rightarrow$ `c5f8e2b` (HEAD, inclusive)  
**Período:** 11 de Octubre de 2026 – 14 de Octubre de 2026  
**Rama:** `main` / `develop`  
**Impacto:** 155 archivos modificados, **+19,624 adiciones**, **-3,720 eliminaciones**

---

## 1. Resumen Ejecutivo

Entre el commit `16d043b` (*"add telegram confirmation of orders from the whatsapp agent"*) y el commit `c5f8e2b` (*"add: documentation of the project on october 14th"*), el sistema evolucionó desde una plataforma de catálogo con punto de venta monotienda e integraciones de mensajería, hacia un **ERP integral de gestión comercial, logística y financiera**.

Las transformaciones principales abarcan:
1. **Arquitectura Multisucursal:** Gestión de inventario distribuido, niveles de stock por sede y traspasos entre sucursales con estados de despacho y recepción.
2. **Módulo Financiero y Tesorería:** Cajas POS con arqueo y control de descuadres, cuentas de dinero (bancos, cajas chicas, billeteras), registro de gastos operativos, cierres de período y reportes (Estado de Resultados y Flujo de Caja).
3. **Módulo de Compras y Reabastecimiento Masivo:** Gestión de órdenes de compra con proveedores, recepción de mercancía y actualización automática de stock.
4. **Kardex Valorado (CPP):** Trazabilidad completa de inventario mediante Costo Promedio Ponderado para cada producto y variante, tanto consolidado como individual.
5. **Diferenciación de Precios, Costos y Medidas por Variante:** Soporte para precios y costos independientes por variante/talla, cálculo automático de margen comercial, guía de tallas y conversión monetaria (soles a bolivianos).
6. **Módulo de Devoluciones y Cambios:** Proceso guiado para devoluciones totales o parciales con reingreso a stock, reembolso a cuentas de dinero y gestión de diferencias de precio en cambios.
7. **Centro de Notificaciones y Alertas:** Campana en tiempo real con monitoreo de stock crítico, traspasos pendientes y cajas abiertas.
8. **Marco Legal y Ajustes del Sistema:** Páginas públicas para políticas de cookies, privacidad, términos y devoluciones, banner de cookies y panel de ajustes administrativos.
9. **Reestructuración de Documentación:** Separación en tres guías maestras (`API_DOCUMENTACION.md`, `ENDPOINTS_PUBLICOS_Y_EXTERNOS.md` y `SISTEMA_CENTRAL.md`).

---

## 2. Cronología de Commits

| Hash | Fecha | Mensaje del Commit | Enfoque Principal |
| :--- | :--- | :--- | :--- |
| **`099ba07`** | 2026-10-11 | `add politics,cookies, medidas products and cost with soles` | Módulo de ajustes, políticas legales públicas, banner de cookies, medidas en productos y costos en soles. |
| **`3e08f0e`** | 2026-10-12 | `add diference in price and cost,medidas` | Precios y costos por variante, márgenes de ganancia, guía de tallas, utilidades en `pricing.ts`, limpieza de planes antiguos. |
| **`0926113`** | 2026-10-12 | `add diference in price and cost,medidas` | Ajuste menor en esquema de producto y redondeo de precios en `pricing.ts`. |
| **`a8d2088`** | 2026-10-12 | `add: restock of massive products and valorated cards` | Módulo de Compras (restock masivo) y Kardex valorado bajo Costo Promedio Ponderado (CPP). |
| **`088dab4`** | 2026-10-12 | `add: restock of massive products and valorated cards` | Corrección menor de importación en modelo de compras. |
| **`456edd6`** | 2026-10-12 | `add: restock of massive products and valorated cards` | Ajuste de tipado en modelo de compras. |
| **`3946b0e`** | 2026-10-12 | `update: add image of variant in buy's register` | Visualización de imágenes de variantes en formulario y tabla de compras. |
| **`efac2fb`** | 2026-10-12 | `add: implement of multisucursal` | Soporte multisucursal: sucursales, traspasos, stock por sucursal, script de migración, escáner POS por sucursal. |
| **`aa41b29`** | 2026-10-12 | `add: implement of multisucursal` | Asociación de compras con sucursal destino (`sucursalId`). |
| **`7215726`** | 2026-10-12 | `add: finance tools` | Cuentas de dinero, movimientos, sesiones de caja POS, gastos, cierres de período, reportes financieros y devoluciones. |
| **`4b373cf`** | 2026-10-13 | `update: add ausent thing about functions in the system` | Campana de notificaciones, modal de devolución/cambio, modal de stock multi-sucursal, asignación de sucursal a usuarios y CRUD de sucursales/cuentas. |
| **`c5f8e2b`** | 2026-10-14 | `add: documentation of the project on october 14th` | Actualización de documentación técnica centralizada (`API_DOCUMENTACION.md`, `ENDPOINTS_PUBLICOS_Y_EXTERNOS.md`, `SISTEMA_CENTRAL.md`). |

---

## 3. Detalle Funcional por Módulos

### 3.1. Arquitectura Multisucursal y Traspasos
- **Gestión de Sucursales:**
  - Nueva página administrativa en `/dashboard/admin/sucursales` con operaciones completas de creación, edición, estado activo/inactivo y eliminación controlada.
  - Modelo `Sucursal` (`src/models/sucursal.ts`) con campos de identificación, dirección, teléfono, encargado y estado operativo.
  - Script de migración `scripts/seed-and-migrate-branches.js` para migrar inventario existente hacia la sucursal matriz y generar registros iniciales.
- **Inventario por Sede (`NivelStock`):**
  - Modelo `NivelStock` (`src/models/nivelStock.ts`) que particiona el stock por combinación de `productoId`, `varianteId` (o SKU) y `sucursalId`.
  - Servicio `BranchStockService` (`branch-stock.service.ts`) para sincronizar incrementos, decrementos y validaciones de disponibilidad en tiempo real.
  - Modal interactivo `StockSucursalesModal.tsx` accesible desde la lista de productos para consultar la distribución del stock en cada sucursal física.
- **Traspasos de Mercancía (`Traspaso`):**
  - Interfaz integral en `/dashboard/admin/inventario/traspasos`.
  - Flujo formal de 3 etapas gestionado por `TransfersService`:
    1. **Borrador / Solicitud:** Definición de origen, destino y desglose de ítems.
    2. **Despacho:** Salida de ítems del origen; los ítems pasan a estado `en_transito`.
    3. **Recepción:** Ingreso efectivo al destino incrementando los niveles de stock correspondientes.
    4. **Anulación:** Reversión controlada si el traspaso aún no ha sido recibido.

---

### 3.2. Finanzas, Tesorería y Sesiones de Caja
- **Cajas POS y Arqueo en Vivo (`SesionCaja`):**
  - Modelo `SesionCaja` (`src/models/sesionCaja.ts`) que audita la vida útil de cada turno de caja.
  - Componente `CajaPosWidget.tsx` incrustado en el punto de venta (`VentaPOS.tsx`):
    - Apertura con fondo de caja inicial.
    - Registro de ingresos y retiros manuales con justificación.
    - Balance teórico contra conteo físico (arqueo final) con detección y registro de sobrantes o faltantes.
  - Resumen y auditoría de sesiones en `/dashboard/admin/finanzas/cajas`.
- **Cuentas de Dinero y Transferencias (`CuentaDinero` & `MovimientoCuenta`):**
  - Gestión de cuentas de efectivo, cuentas bancarias (BCP, Banco Unión, etc.) y billeteras electrónicas en `/dashboard/admin/finanzas/cuentas`.
  - Registro de movimientos con clasificación contable (ventas, compras, devoluciones, gastos, transferencias).
  - Módulo de transferencia entre cuentas con débito y crédito simétrico e historial de transacciones.
  - Script de inicialización `scripts/seed-initial-cash-accounts.js`.
- **Gastos Operativos (`Gasto`):**
  - Módulo en `/dashboard/admin/finanzas/gastos` para registrar egresos no vinculados a compras directas (alquileres, sueldos, servicios básicos, insumos, mantenimiento).
  - Vinculación obligatoria con una cuenta de dinero y deducción automática del balance.
- **Cierres de Período y Auditoría (`CierrePeriodo`):**
  - Congelamiento contable de períodos mensuales o anuales para prevenir modificaciones retroactivas de transacciones.
  - Mecanismo administrativo de reapertura controlada con registro de motivos.
- **Reportes Financieros Avanzados:**
  - Panel en `/dashboard/admin/finanzas/reportes` con:
    - **Estado de Resultados (P&L):** Ingresos brutos por ventas, devoluciones, Costo de Mercancía Vendida (COGS basado en CPP), utilidad bruta, gastos operativos y utilidad neta.
    - **Flujo de Caja:** Entradas y salidas operativas desglosadas por período y cuenta de dinero.

---

### 3.3. Compras Masivas y Reabastecimiento de Inventario
- **Modelo y Estados de Compra (`Compra`):**
  - Modelo `Compra` (`src/models/compra.ts`) con estados: `borrador`, `confirmada`, `recibida` y `cancelada`.
  - Soporte para datos de proveedor, número de factura o recibo, sucursal de recepción y condición de pago (contado o crédito).
- **Formulario de Registro Masivo (`NuevaCompraForm.tsx`):**
  - Ubicado en `/dashboard/admin/inventario/compras/nueva`.
  - Permite cargar múltiples productos y variantes en una única orden.
  - Previsualización gráfica de las variantes de prendas (imágenes) introducida en el commit `3946b0e`.
  - Cálculo automático de totales, impuestos, costos unitarios y cuenta de egreso de tesorería.
- **Actualización de Stock y Costos:**
  - Al marcar una compra como `recibida`, el sistema incrementa el stock de la sucursal seleccionada y recalcula el costo ponderado del producto/variante.
  - Tabla de control y acciones en `/dashboard/admin/inventario/compras` (`ComprasTable.tsx`).

---

### 3.4. Kardex Físico y Valorado (Costo Promedio Ponderado - CPP)
- **Fórmula de Costo Promedio Ponderado:**
  - Implementada en `src/utils/pricing.ts` mediante la función `calcularCostoPromedioPonderado`:
    $$\text{Nuevo Costo} = \frac{(\text{Stock Actual} \times \text{Costo Actual}) + (\text{Cantidad Nueva} \times \text{Costo Nuevo})}{\text{Stock Actual} + \text{Cantidad Nueva}}$$
- **Vistas del Kardex en el Dashboard:**
  - Ubicadas en `/dashboard/admin/inventario/kardex`.
  - **Kardex Consolidado (`KardexConsolidadoView.tsx`):** Panorama global valorizado del inventario completo del negocio.
  - **Kardex Individual (`KardexIndividualModal.tsx`):** Historial cronológico línea por línea de cada movimiento de un producto o variante (entradas por compra, salidas por venta, traspasos entre sucursales, ajustes y devoluciones) con saldos físicos y monetarios.

---

### 3.5. Diferenciación de Precios, Costos, Márgenes y Medidas
- **Precios y Costos Desacoplados por Variante:**
  - Las variantes pueden tener precios de venta y costos de adquisición independientes (ej. tallas XL o ruanas especiales con mayor costo y precio que una talla S).
  - **Patrón Fallback:** Si una variante no define precio o costo propio, hereda de forma transparente los valores base del producto padre (`getVariantPricing` en `pricing.ts`).
  - Cálculo de rango de precios (`getProductPriceRange`) para mostrar al cliente etiquetas como *"Bs 100.00 - Bs 130.00"* si el precio varía según la variante.
- **Medidas Físicas y Guía de Tallas:**
  - Nuevos campos para registrar dimensiones específicas de las prendas (contorno de busto, cintura, cadera, largo total, etc.).
  - Componente `GuiaTallasModal.tsx` para que tanto el vendedor como el cliente puedan verificar las medidas reales de cada talla.
- **Compatibilidad Monetaria en Soles:**
  - Soporte en esquemas y modelos para registrar costos de importación en Soles peruanos y conversión a Bolívares/Bolivianos según tipo de cambio configurable.

---

### 3.6. Devoluciones y Cambios de Mercadería
- **Modelo `DevolucionCambio` (`src/models/devolucionCambio.ts`):**
  - Registro de tipo de operación (`devolucion` vs `cambio`), motivo justificado, ítems afectados y comprobante original.
- **Modal Integrado (`DevolucionCambioModal.tsx`):**
  - Accesible directamente desde el detalle del pedido en administración y POS (`OrderDetailModal.tsx`, `VentaDetalleModal.tsx`).
  - **Devolución:** Reintegro de la prenda al stock de la sucursal y devolución de dinero a la cuenta seleccionada.
  - **Cambio:** Salida de la nueva prenda, reingreso de la devuelta, y cálculo automático de saldos (cobro de diferencia si la nueva prenda cuesta más, o nota/saldo a favor si cuesta menos).
- **Vista de Auditoría:**
  - Listado y control histórico en `/dashboard/admin/finanzas/devoluciones`.

---

### 3.7. Centro de Alertas y Notificaciones en Tiempo Real
- **Endpoint Resumen (`/api/notificaciones/resumen`):**
  - Consolida métricas críticas del sistema:
    - Productos con stock por debajo del mínimo en cualquier sucursal.
    - Traspasos pendientes de ser despachados o recibidos.
    - Cajas abiertas con turnos prolongados o discrepancias detectadas.
    - Devoluciones o pedidos con observaciones.
- **Componente `NotificationBell.tsx`:**
  - Añadido al `DashboardHeader.tsx` con contador flotante dinámico y menú desplegable para navegación rápida hacia el módulo afectado.

---

### 3.8. Ajustes del Sistema y Políticas Legales
- **Panel Central de Ajustes:**
  - Página `/dashboard/admin/ajustes` con navegación por pestañas:
    - `FinanzasSettingsTab.tsx`: Tipo de cambio, alertas de caja, cuentas por defecto.
    - `PoliticasSettingsTab.tsx`: Editor de contenidos de políticas públicas.
- **Páginas Web Públicas:**
  - `/politica-cookies`
  - `/politica-devolucion`
  - `/politica-privacidad`
  - `/terminos-condiciones`
  - Utilizan el nuevo contenedor visual `PoliticaLayout.tsx` y se enlazan en la página principal (`src/app/page.tsx`).
- **Banner de Consentimiento:**
  - `CookieConsentBanner.tsx` con almacenamiento local de preferencias de navegación del usuario.

---

### 3.9. Usuarios, Seguridad y Middleware
- **Asignación de Sucursales a Usuarios:**
  - Atributo `sucursalId` en el modelo `User` y en los formularios de creación/edición (`UsuarioModal.tsx`, `UsuarioTable.tsx`).
  - Restricción para cajeros y vendedores: sus operaciones en el POS se imputan automáticamente a su sucursal asignada.
- **Protección de Rutas en `middleware.ts`:**
  - Verificación de roles y permisos para acceso a rutas de compras, finanzas, kardex y traspasos.

---

### 3.10. Reestructuración de la Documentación del Proyecto
En el commit `c5f8e2b`, toda la documentación dispersa fue reorganizada en tres especificaciones maestras:
1. **`API_DOCUMENTACION.md`:** Catálogo de 58+ endpoints internos de la API (inventario, kardex, compras, finanzas, sucursales, traspasos, ajustes, POS).
2. **`ENDPOINTS_PUBLICOS_Y_EXTERNOS.md`:** Documentación de endpoints públicos para la tienda web, catálogo para agentes externos, pasarelas de pago y webhooks de Telegram/WhatsApp.
3. **`SISTEMA_CENTRAL.md`:** Arquitectura técnica, diagramas de módulos, reglas de negocio, ciclo de vida de inventario, kardex y finanzas.
4. Eliminación de archivos temporales desactualizados (`DOCUMENTACION_SISTEMA_AGENTES.md`, `PLANIFICACION.md`, `PLAN_IMPLEMENTACION_COMPLETO.md`).

---

## 4. Inventario de Archivos Creados y Modificados

### Nuevos Modelos Mongoose (`src/models/`)
| Archivo | Descripción |
| :--- | :--- |
| `ajustesSistema.ts` | Configuración global del sistema (políticas, parámetros financieros, tipo de cambio). |
| `sucursal.ts` | Sucursales y puntos de venta físicos de la empresa. |
| `nivelStock.ts` | Existencias segregadas por sucursal, producto y variante. |
| `traspaso.ts` | Documentos de transferencia de mercadería entre sucursales. |
| `compra.ts` | Facturas/órdenes de compra masivas a proveedores con costeo. |
| `cuentaDinero.ts` | Cuentas bancarias, cajas de efectivo y billeteras digitales. |
| `movimientoCuenta.ts` | Libro diario de entradas, salidas y transferencias financieras. |
| `sesionCaja.ts` | Sesiones de punto de venta (aperturas, arqueos, cierres y descuadres). |
| `gasto.ts` | Gastos operativos categorizados no asociados directamente a compra de mercancía. |
| `cierrePeriodo.ts` | Bloqueos de períodos fiscales/contables para cierre mensual/anual. |
| `devolucionCambio.ts` | Registro y resolución de devoluciones y cambios de mercadería. |

### Nuevas Rutas de API (`src/app/api/`)
| Endpoint / Ruta | Método(s) | Módulo |
| :--- | :--- | :--- |
| `/api/admin/ajustes` | `GET`, `PUT` | Configuración |
| `/api/public/politicas` | `GET` | Público / Legal |
| `/api/admin/sucursales` | `GET`, `POST` | Sucursales |
| `/api/admin/sucursales/[id]` | `GET`, `PUT`, `DELETE` | Sucursales |
| `/api/admin/productos/[id]/stock-sucursales` | `GET` | Sucursales / Inventario |
| `/api/admin/traspasos` | `GET`, `POST` | Traspasos |
| `/api/admin/traspasos/[id]` | `GET`, `DELETE` | Traspasos |
| `/api/admin/traspasos/[id]/despachar` | `POST` | Traspasos |
| `/api/admin/traspasos/[id]/recibir` | `POST` | Traspasos |
| `/api/compras` | `GET`, `POST` | Compras |
| `/api/compras/[id]` | `GET`, `PUT`, `DELETE` | Compras |
| `/api/inventario/kardex/[productoId]` | `GET` | Kardex |
| `/api/inventario/kardex/consolidado` | `GET` | Kardex |
| `/api/pos/caja/activa` | `GET` | Finanzas / POS |
| `/api/pos/caja/apertura` | `POST` | Finanzas / POS |
| `/api/pos/caja/cierre` | `POST` | Finanzas / POS |
| `/api/pos/caja/movimiento-manual` | `POST` | Finanzas / POS |
| `/api/admin/pos/cajas` | `GET` | Finanzas / Auditoría |
| `/api/admin/finanzas/cuentas` | `GET`, `POST` | Finanzas / Cuentas |
| `/api/admin/finanzas/cuentas/[id]` | `GET`, `PUT` | Finanzas / Cuentas |
| `/api/admin/finanzas/cuentas/[id]/movimientos`| `GET` | Finanzas / Cuentas |
| `/api/admin/finanzas/cuentas/transferencia` | `POST` | Finanzas / Cuentas |
| `/api/admin/finanzas/gastos` | `GET`, `POST` | Finanzas / Gastos |
| `/api/admin/finanzas/gastos/[id]` | `DELETE` | Finanzas / Gastos |
| `/api/admin/finanzas/periodos` | `GET`, `POST` | Finanzas / Cierres |
| `/api/admin/finanzas/periodos/[id]/reabrir` | `POST` | Finanzas / Cierres |
| `/api/admin/finanzas/reportes/estado-resultados`| `GET` | Finanzas / Reportes |
| `/api/admin/finanzas/reportes/flujo-caja` | `GET` | Finanzas / Reportes |
| `/api/admin/finanzas/devoluciones` | `GET` | Finanzas / Devoluciones |
| `/api/pedidos/[id]/devoluciones` | `POST` | Finanzas / Ventas |
| `/api/notificaciones/resumen` | `GET` | Alertas del Sistema |

### Nuevas Páginas de la Aplicación Next.js (`src/app/`)
- `/app/dashboard/admin/sucursales/page.tsx`
- `/app/dashboard/admin/inventario/traspasos/page.tsx`
- `/app/dashboard/admin/inventario/compras/page.tsx`
- `/app/dashboard/admin/inventario/compras/nueva/page.tsx`
- `/app/dashboard/admin/inventario/kardex/page.tsx`
- `/app/dashboard/admin/finanzas/page.tsx`
- `/app/dashboard/admin/finanzas/cajas/page.tsx`
- `/app/dashboard/admin/finanzas/cuentas/page.tsx`
- `/app/dashboard/admin/finanzas/gastos/page.tsx`
- `/app/dashboard/admin/finanzas/flujo-caja/page.tsx`
- `/app/dashboard/admin/finanzas/reportes/page.tsx`
- `/app/dashboard/admin/finanzas/devoluciones/page.tsx`
- `/app/dashboard/admin/ajustes/page.tsx`
- `/app/politica-cookies/page.tsx`
- `/app/politica-devolucion/page.tsx`
- `/app/politica-privacidad/page.tsx`
- `/app/terminos-condiciones/page.tsx`

### Nuevos Componentes UI Principales (`src/components/`)
- **`pos/CajaPosWidget.tsx`**: Widget integrado en el POS para gestión de turnos de caja, ingresos/retiros manuales y arqueo en vivo.
- **`inventario/NuevaCompraForm.tsx`**: Formulario dinámico para registrar compras masivas con soporte para variantes e imágenes.
- **`inventario/ComprasTable.tsx`**: Tabla de órdenes de compra con filtros, badges de estado y opciones de recepción/anulación.
- **`inventario/KardexConsolidadoView.tsx`**: Tabla de valorización global de existencias y costos promedio.
- **`inventario/KardexIndividualModal.tsx`**: Vista cronológica de movimientos de entrada/salida y saldos ponderados.
- **`productos/StockSucursalesModal.tsx`**: Visualizador de existencias por sucursal para cada variante de un producto.
- **`productos/GuiaTallasModal.tsx`**: Visualizador de medidas anatómicas y dimensiones de prendas.
- **`ventas/DevolucionCambioModal.tsx`**: Asistente interactivo para procesar devoluciones y cambios de prendas con cálculo de balances.
- **`dashboard/NotificationBell.tsx`**: Componente de alertas reactivas en el header del panel.
- **`ajustes/FinanzasSettingsTab.tsx`** y **`PoliticasSettingsTab.tsx`**: Configuración administrativa de finanzas y textos legales.
- **`web/CookieConsentBanner.tsx`** y **`PoliticaLayout.tsx`**: Experiencia de usuario y cumplimiento legal para clientes web.

---

## 5. Conclusión

El tramo de desarrollo comprendido entre `16d043b` y `c5f8e2b` representó la consolidación del software hacia un nivel empresarial. Pasó de gestionar ventas y pedidos a controlar de forma rigurosa la cadena de suministro (compras, traspasos, inventario valorado por CPP), la tesorería (arqueo de cajas, cuentas bancarias, gastos, reportes contables) y la operación multisede. Toda la base de código fue alineada a estas capacidades y respaldada por una documentación técnica completa.
