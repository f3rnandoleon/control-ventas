# Documentación API - Control Ventas (Fit Andes)

**Estado del documento:** Actualizado al 14 de octubre de 2026.  
**Referencia de implementación:** `src/app/api/**/route.ts`  
**Validaciones de entrada:** Esquemas Zod en `src/schemas/*.ts`  
**Capa de datos y persistencia:** Modelos Mongoose en `src/models/*.ts` y módulos de dominio en `src/modules/*`

---

## Índice General

1. [Propósito y Audiencia](#1-propósito-y-audiencia)
2. [Arquitectura y Entornos](#2-arquitectura-y-entornos)
3. [Autenticación, Roles y Seguridad](#3-autenticación-roles-y-seguridad)
4. [Rate Limiting y Convenciones de Error](#4-rate-limiting-y-convenciones-de-error)
5. [Modelos Principales en Respuestas de API](#5-modelos-principales-en-respuestas-de-api)
6. [Catálogo de Endpoints por Dominio](#6-catálogo-de-endpoints-por-dominio)
   - [6.1 Salud y Estado Técnico](#61-salud-y-estado-técnico)
   - [6.2 Catálogo Público y Opciones de Entrega](#62-catálogo-público-y-opciones-de-entrega)
   - [6.3 Políticas Públicas y Legales](#63-políticas-públicas-y-legales)
   - [6.4 Autenticación](#64-autenticación)
   - [6.5 Perfil y Clientes](#65-perfil-y-clientes)
   - [6.6 Carrito de Compras](#66-carrito-de-compras)
   - [6.7 Pedidos y Checkout](#67-pedidos-y-checkout)
   - [6.8 Pagos y Comprobantes](#68-pagos-y-comprobantes)
   - [6.9 Verificación Segura de Pagos (Telegram 1-Click)](#69-verificación-segura-de-pagos-telegram-1-click)
   - [6.10 Fulfillment y Entregas](#610-fulfillment-y-entregas)
   - [6.11 Punto de Venta (POS) y Turnos de Caja](#611-punto-de-venta-pos-y-turnos-de-caja)
   - [6.12 Integración Especializada WhatsApp](#612-integración-especializada-whatsapp)
   - [6.13 Catálogo Interno de Productos](#613-catálogo-interno-de-productos)
   - [6.14 Inventario y Kárdex](#614-inventario-y-kárdex)
   - [6.15 Sucursales y Stock Multitienda](#615-sucursales-y-stock-multitienda)
   - [6.16 Traspasos entre Sucursales](#616-traspasos-entre-sucursales)
   - [6.17 Compras de Proveedores (CPP)](#617-compras-de-proveedores-cpp)
   - [6.18 Tesorería y Cuentas de Dinero](#618-tesorería-y-cuentas-de-dinero)
   - [6.19 Gastos Operativos](#619-gastos-operativos)
   - [6.20 Devoluciones y Cambios](#620-devoluciones-y-cambios)
   - [6.21 Cierres de Periodo Contable](#621-cierres-de-periodo-contable)
   - [6.22 Reportes Financieros y de Ventas](#622-reportes-financieros-y-de-ventas)
   - [6.23 Notificaciones y Alertas](#623-notificaciones-y-alertas)
   - [6.24 Gestión de Usuarios Administrativos](#624-gestión-de-usuarios-administrativos)
   - [6.25 Uploads Multimedia](#625-uploads-multimedia)
   - [6.26 Operaciones, Mantenimiento y Cron](#626-operaciones-mantenimiento-y-cron)
7. [Variables de Entorno](#7-variables-de-entorno)

---

## 1. Propósito y Audiencia

Este documento describe la totalidad de las APIs REST implementadas en el backend de **Fit Andes (`control-ventas`)**.

Está orientado a:
- Desarrolladores y agentes de la **Tienda Web (Storefront)**.
- Desarrolladores y agentes del **Dashboard Interno (`ADMIN` y `VENDEDOR`)**.
- Desarrolladores y agentes de la **App Móvil (POS / Venta en Calle / Clientes)**.
- Integradores del **Bot de WhatsApp y Servicios Satélites**.

---

## 2. Arquitectura y Entornos

- **Framework:** Next.js 15 (App Router, runtime Node.js).
- **Base de Datos:** MongoDB Replicaset con transacciones ACID (`runInTransaction`).
- **Almacenamiento de Archivos:** Cloudinary (`next-cloudinary`).
- **Notificaciones Inmediatas:** Bot de Telegram con enlaces seguros de revisión.

### URLs Base
- **Desarrollo:** `http://localhost:3000/api`
- **Producción:** `https://control-ventas-azure.vercel.app/api`

---

## 3. Autenticación, Roles y Seguridad

### 3.1 Mecanismos de Autenticación
El helper [`resolveApiAuth`](file:///e:/proyectos/control-ropa/control-ventas/src/libs/resolveApiAuth.ts) aplica una estrategia desacoplada:

1. **JWT Bearer Token:**
   Utilizado por la App Móvil, scripts y clientes desacoplados:
   ```http
   Authorization: Bearer <accessToken>
   ```
2. **Sesión Web (NextAuth):**
   Utilizada por el Dashboard Web. Las cookies `httpOnly` son procesadas por el middleware, el cual inyecta de forma segura los encabezados `x-user-id` y `x-user-role`. El middleware elimina cualquier intento de inyección externa de estos headers para evitar spoofing.
3. **API Key de Integración WhatsApp:**
   Utilizada en `/api/integrations/whatsapp/*`. Requiere:
   ```http
   Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>
   ```
   Valida el secreto en tiempo constante con `crypto.timingSafeEqual`.
4. **Token de Cron:**
   Utilizado en `/api/admin/cron/*`:
   ```http
   Authorization: Bearer <CRON_SECRET>
   ```

### 3.2 Matriz de Acceso por Rol
| Dominio | CLIENTE | VENDEDOR | ADMIN |
|---|---|---|---|
| Catálogo público / Políticas / Delivery Options | Sí | Sí | Sí |
| Catálogo interno / Búsqueda por código | No | Sí | Sí |
| Carrito y Checkout de cliente | Sí | No | No |
| Mis Pedidos (propios) | Sí | No | No |
| Pedidos operativos maestros | No | Sí | Sí |
| Pagos (confirmación, fallo, comprobante) | Sí (sus pagos) | Sí (staff) | Sí |
| Reembolsos (Refund) | No | Sí | Sí |
| Entregas / Fulfillment | Lectura propia | Sí | Sí |
| POS (Venta mostrador, escáner, cajas) | No | Sí | Sí |
| Sucursales y Traspasos | No | Sí (operativo) | Sí (total) |
| Inventario / Kárdex | No | Sí (lectura) | Sí (ajustes) |
| Compras a Proveedores | No | Sí (lectura) | Sí (creación/anulación) |
| Finanzas (Cuentas, Gastos, Periodos, P&L) | No | No | Sí |
| Notificaciones / Alertas | No | Sí | Sí |
| Reportes gerenciales | No | No | Sí |
| Usuarios / Ops / Auditoría / Cron | No | No | Sí |

---

## 4. Rate Limiting y Convenciones de Error

### 4.1 Rate Limiting (en Memoria)
- **Login / Signup / Auth:** 5 peticiones/min por IP.
- **Catálogo Público (`/api/productos/publicos`):** 100 peticiones/min por IP.
- **Lectura protegida (`GET`):** 60 peticiones/min por usuario.
- **Escritura protegida (`POST`, `PUT`, `PATCH`, `DELETE`):** 30 peticiones/min por usuario.
- **Respuesta 429:** `{ "message": "Demasiadas solicitudes. Inténtalo más tarde." }` con cabecera `Retry-After: 60`.

### 4.2 Respuestas de Error
- **Error de validación Zod (HTTP 400):**
  ```json
  {
    "message": "Datos invalidos",
    "errors": [
      { "field": "email", "message": "Email no válido" }
    ]
  }
  ```
- **Error de negocio / AppError (HTTP 400, 404, 409):**
  ```json
  {
    "message": "Stock insuficiente en la sucursal seleccionada",
    "code": "INSUFFICIENT_STOCK"
  }
  ```

---

## 5. Modelos Principales en Respuestas de API

### 5.1 Producto Público Sanitizado
Los clientes no reciben `precioCosto`, `variantes.codigoBarra` ni `variantes.qrCode`:
```json
{
  "_id": "670e10a2f1b4c90012345678",
  "nombre": "Chompa Alpaca Andina",
  "modelo": "Invierno 2026",
  "sku": "CH-ALP-001",
  "categoria": "Chompas",
  "precioVenta": 135.00,
  "descuento": 0,
  "stockTotal": 14,
  "estado": "ACTIVO",
  "variantes": [
    {
      "varianteId": "var-alp-neg-m",
      "color": "Negro",
      "colorSecundario": "Gris",
      "talla": "M",
      "stock": 8,
      "stockReservado": 1,
      "stockDisponible": 7,
      "imagenes": ["https://res.cloudinary.com/..."],
      "medidas": {
        "anchoPecho": 52,
        "anchoHombros": 44,
        "largoTotal": 68
      }
    }
  ]
}
```

### 5.2 Pedido Unificado
```json
{
  "_id": "670e3001f1b4c90011223344",
  "numeroPedido": "P-261014-089",
  "canal": "WEB",
  "estadoPedido": "PENDING_PAYMENT",
  "estadoPago": "PENDING",
  "estadoEntrega": "PENDING",
  "estadoReservaStock": "RESERVED",
  "metodoPago": "QR",
  "subtotal": 135.00,
  "costoEnvio": 0.00,
  "descuento": 0.00,
  "total": 135.00,
  "reservaExpiraEn": "2026-10-14T06:50:00.000Z",
  "snapshotCliente": {
    "nombreCompleto": "Carlos Mendoza",
    "telefono": "59178965412"
  },
  "snapshotEntrega": {
    "metodo": "PICKUP_POINT",
    "puntoRecojo": "Estación Teleférico Central"
  },
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "cantidad": 1,
      "precioUnitario": 135.00,
      "totalLinea": 135.00
    }
  ]
}
```

---

## 6. Catálogo de Endpoints por Dominio

### 6.1 Salud y Estado Técnico
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/estado` | Pública | Healthcheck técnico de MongoDB y soporte de transacciones |

---

### 6.2 Catálogo Público y Opciones de Entrega
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/productos/publicos` | Pública | Listado de catálogo con búsqueda (`q`), filtros (`categoria`, `color`, `talla`, `soloDisponible`) y paginación (`page`, `limit`) |
| `GET` | `/api/productos/publicos/:id` | Pública | Detalle de producto con variantes, stock vendible y medidas |
| `GET` | `/api/delivery-options` | Pública | Lista de puntos de recojo, horarios y empresas de envío por departamento |

---

### 6.3 Políticas Públicas y Legales
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/public/politicas` | Pública | Políticas legales (devoluciones, privacidad, términos, cookies) |
| `GET` | `/api/admin/ajustes` | `ADMIN` | Consulta configuración del sistema (tipo de cambio PEN/BOB, políticas) |
| `PATCH` | `/api/admin/ajustes` | `ADMIN` | Modifica tipo de cambio o texto de políticas legales |

---

### 6.4 Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Pública | Registro de nuevos clientes con rol `CLIENTE` |
| `POST` | `/api/auth/login` | Pública | Inicio de sesión (devuelve `accessToken` JWT y objeto `user`) |
| `POST` | `/api/auth/google` | Pública | Autenticación con token de Google OAuth |
| `GET/POST`| `/api/auth/[...nextauth]`| Web | Endpoint del manejador de sesión NextAuth para la web |

---

### 6.5 Perfil y Clientes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/perfil` | Autenticado | Obtiene datos básicos del usuario autenticado |
| `PUT` | `/api/perfil` | Autenticado | Actualiza nombre, email o contraseña del usuario |
| `GET` | `/api/clientes/me` | `CLIENTE` | Perfil del cliente, documento y dirección predeterminada |
| `PUT` | `/api/clientes/me` | `CLIENTE` | Actualiza teléfono, tipo de documento o notas de cliente |
| `GET` | `/api/clientes/me/direcciones` | `CLIENTE` | Lista libreta de direcciones guardadas del cliente |
| `POST` | `/api/clientes/me/direcciones` | `CLIENTE` | Registra una nueva dirección guardada |
| `PATCH` | `/api/clientes/me/direcciones/:id` | `CLIENTE` | Modifica una dirección existente |
| `DELETE`| `/api/clientes/me/direcciones/:id` | `CLIENTE` | Elimina una dirección guardada |

---

### 6.6 Carrito de Compras
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/carrito` | `CLIENTE` | Obtiene el carrito sincronizado en base de datos con stock validado |
| `DELETE` | `/api/carrito` | `CLIENTE` | Vacía todos los ítems del carrito |
| `POST` | `/api/carrito/items` | `CLIENTE` | Agrega un producto y variante con validación atómica de existencias |
| `PATCH` | `/api/carrito/items/:itemId` | `CLIENTE` | Actualiza la cantidad solicitada de un ítem |
| `DELETE` | `/api/carrito/items/:itemId` | `CLIENTE` | Elimina un ítem específico del carrito |

---

### 6.7 Pedidos y Checkout
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/pedidos/checkout` | `CLIENTE` | Convierte el carrito en pedido, reserva stock y genera orden de pago |
| `GET` | `/api/mis-pedidos` | `CLIENTE` | Historial de pedidos del cliente autenticado |
| `GET` | `/api/mis-pedidos/:id` | `CLIENTE` | Detalle de un pedido perteneciente al cliente |
| `GET` | `/api/pedidos` | `ADMIN`, `VENDEDOR` | Listado maestro de pedidos (soporta `?scope=sales`) |
| `GET` | `/api/pedidos/:id` | Staff o dueño | Detalle completo de orden |
| `PATCH` | `/api/pedidos/:id` | Staff o cliente | Staff: actualiza estados. Cliente: cancela orden pendiente |
| `POST` | `/api/pedidos/:id/confirm-cash` | `ADMIN`, `VENDEDOR` | Confirma pago en efectivo y consume stock |
| `POST` | `/api/pedidos/:id/confirm-for-delivery` | `ADMIN`, `VENDEDOR` | Aprueba pedido para pase a despacho |
| `POST` | `/api/pedidos/:id/devoluciones` | `ADMIN`, `VENDEDOR` | Registra devolución o cambio de prenda |

---

### 6.8 Pagos y Comprobantes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/pagos` | Autenticado | Crea transacción de pago vinculada a un pedido |
| `POST` | `/api/pagos/:id/confirm` | Staff | Confirma pago manualmente, consume stock e ingresa dinero a tesorería |
| `POST` | `/api/pagos/:id/fail` | Staff o dueño | Marca pago como fallido y libera el stock reservado |
| `POST` | `/api/pagos/:id/refund` | `ADMIN`, `VENDEDOR` | Reembolsa pago, repone stock vendible y registra egreso contable |
| `POST` | `/api/pagos/:id/upload-comprobante` | `CLIENTE`, Staff | Sube comprobante a Cloudinary y dispara alerta interactiva en Telegram |

---

### 6.9 Verificación Segura de Pagos (Telegram 1-Click)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/verificar/pago/:token` | Staff | Vista web segura para revisar la captura del comprobante |
| `POST` | `/api/verificar/pago/:token/confirm` | Staff | Aprobación en 1 clic del pago, consumiendo stock de forma atómica |
| `POST` | `/api/verificar/pago/:token/reject` | Staff | Rechazo de comprobante inválido/borroso |

---

### 6.10 Fulfillment y Entregas
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/entregas` | `ADMIN`, `VENDEDOR` | Crea o sincroniza la entidad logística de un pedido |
| `GET` | `/api/entregas/:id` | Staff o dueño | Consulta el estado logístico, guía de transporte y repartidor |
| `PATCH` | `/api/entregas/:id/status` | `ADMIN`, `VENDEDOR` | Avanza estado (`READY`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`) y registra marcas de tiempo |

---

### 6.11 Punto de Venta (POS) y Turnos de Caja
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/pos/scan/:code` | `ADMIN`, `VENDEDOR` | Escaneo rápido por código de barras o QR de etiqueta de prenda |
| `POST` | `/api/pos/sales` | `ADMIN`, `VENDEDOR` | Venta directa en mostrador con descuento automático de stock y registro en caja |
| `GET` | `/api/pos/my-sales` | `ADMIN`, `VENDEDOR` | Lista las ventas directas del vendedor autenticado |
| `GET` | `/api/pos/summary` | `ADMIN`, `VENDEDOR` | Resumen de ventas, ingresos, ganancias y desglose efectivo vs QR |
| `GET` | `/api/pos/caja/activa` | `ADMIN`, `VENDEDOR` | Consulta si existe turno de caja abierto en la sucursal |
| `POST` | `/api/pos/caja/apertura` | `ADMIN`, `VENDEDOR` | Abre turno de caja con monto de fondo inicial |
| `POST` | `/api/pos/caja/cierre` | `ADMIN`, `VENDEDOR` | Cierra turno con arqueo de efectivo y cálculo automático de descuadre |
| `POST` | `/api/pos/caja/movimiento-manual` | `ADMIN`, `VENDEDOR` | Registra egreso menor (ej. almuerzo, limpieza) o ingreso manual |
| `GET` | `/api/admin/pos/cajas` | `ADMIN` | Historial administrativo de sesiones de caja de todas las sucursales |

---

### 6.12 Integración Especializada WhatsApp
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/integrations/whatsapp/orders` | API Key Bot | Creación de pedido con idempotencia, reserva hasta fin de día (La Paz UTC-4) e instrucciones de BancoSol |
| `POST` | `/api/integrations/whatsapp/payments/:id/proof`| API Key Bot | Subida de captura de comprobante enviada por el cliente, prórroga de reserva 48h y notificación a Telegram |
| `GET` | `/api/integrations/whatsapp/orders/:nro` | API Key Bot | Consulta de estado de orden filtrada por número de teléfono del cliente |

---

### 6.13 Catálogo Interno de Productos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/productos` | `ADMIN`, `VENDEDOR` | Listado completo con stock de variantes y costos |
| `POST` | `/api/productos` | `ADMIN` | Alta de nueva prenda con sus variantes |
| `GET` | `/api/productos/:id` | `ADMIN`, `VENDEDOR` | Ficha técnica interna de producto |
| `PUT` | `/api/productos/:id` | `ADMIN` | Edición de producto, variantes, precios y categorías |
| `DELETE` | `/api/productos/:id` | `ADMIN` | Baja de producto |
| `GET` | `/api/productos/by-code/:code` | `ADMIN`, `VENDEDOR` | Búsqueda por código de barras o QR interno |

---

### 6.14 Inventario y Kárdex
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/inventario` | `ADMIN`, `VENDEDOR` | Movimientos generales de inventario |
| `POST` | `/api/inventario` | `ADMIN` | Registro manual de ajuste de stock |
| `GET` | `/api/inventario/:productoId` | `ADMIN`, `VENDEDOR` | Kárdex específico por producto |
| `GET` | `/api/inventario/kardex/consolidado` | `ADMIN` | Kárdex físico y valorado consolidado del negocio |

---

### 6.15 Sucursales y Stock Multitienda
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/sucursales` | `ADMIN`, `VENDEDOR` | Listado de tiendas físicas y almacenes centrales |
| `POST` | `/api/admin/sucursales` | `ADMIN` | Alta de nueva sucursal |
| `GET` | `/api/admin/sucursales/:id` | `ADMIN` | Detalle de sucursal |
| `PUT` | `/api/admin/sucursales/:id` | `ADMIN` | Modificación de sucursal |
| `DELETE` | `/api/admin/sucursales/:id` | `ADMIN` | Desactivación de sucursal |
| `GET` | `/api/admin/productos/:id/stock-sucursales` | `ADMIN`, `VENDEDOR` | Desglose de existencias físicas y reservadas por sucursal para un producto |

---

### 6.16 Traspasos entre Sucursales
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/traspasos` | `ADMIN`, `VENDEDOR` | Listado de solicitudes de traspaso de mercadería |
| `POST` | `/api/admin/traspasos` | `ADMIN`, `VENDEDOR` | Crear solicitud de traspaso (`SOLICITADA`) validando existencias en origen |
| `GET` | `/api/admin/traspasos/:id` | `ADMIN`, `VENDEDOR` | Detalle de un traspaso y sus ítems |
| `POST` | `/api/admin/traspasos/:id/despachar` | `ADMIN`, `VENDEDOR` | Despacho: descuenta stock de origen y asienta `TRASPASO_SALIDA` |
| `POST` | `/api/admin/traspasos/:id/recibir` | `ADMIN`, `VENDEDOR` | Recepción: ingresa stock a destino y asienta `TRASPASO_ENTRADA` |

---

### 6.17 Compras de Proveedores (CPP)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/compras` | `ADMIN`, `VENDEDOR` | Historial de compras registradas a proveedores |
| `POST` | `/api/compras` | `ADMIN` | Registro de compra: incrementa stock, recalcula Costo Promedio Ponderado (CPP), genera asiento `ENTRADA` y egreso financiero |
| `GET` | `/api/compras/:id` | `ADMIN`, `VENDEDOR` | Detalle de compra y desglose de ítems |
| `DELETE`| `/api/compras/:id` | `ADMIN` | Anulación de compra: revierte existencias y reembolsa a tesorería |

---

### 6.18 Tesorería y Cuentas de Dinero
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/finanzas/cuentas` | `ADMIN` | Listado de cuentas (cajas físicas, bancos, QR) y saldos vigentes |
| `POST` | `/api/admin/finanzas/cuentas` | `ADMIN` | Alta de cuenta bancaria o caja física |
| `GET` | `/api/admin/finanzas/cuentas/:id` | `ADMIN` | Detalle de cuenta |
| `PUT` | `/api/admin/finanzas/cuentas/:id` | `ADMIN` | Actualiza datos de cuenta |
| `DELETE`| `/api/admin/finanzas/cuentas/:id` | `ADMIN` | Desactiva cuenta |
| `GET` | `/api/admin/finanzas/cuentas/:id/movimientos` | `ADMIN` | Historial contable de movimientos con saldos anteriores y posteriores |
| `POST` | `/api/admin/finanzas/cuentas/transferencia` | `ADMIN` | Traspaso de fondos entre cuentas (ej. depósito de caja física a banco) |

---

### 6.19 Gastos Operativos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/finanzas/gastos` | `ADMIN` | Listado de gastos clasificados por categoría y sucursal |
| `POST` | `/api/admin/finanzas/gastos` | `ADMIN` | Registra egreso operativo descontando saldo de la cuenta de dinero |
| `DELETE`| `/api/admin/finanzas/gastos/:id` | `ADMIN` | Anula gasto y reintegra el dinero a la cuenta |

---

### 6.20 Devoluciones y Cambios
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/finanzas/devoluciones` | `ADMIN` | Listado y resumen financiero de devoluciones y cambios procesados |

---

### 6.21 Cierres de Periodo Contable
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/finanzas/periodos` | `ADMIN` | Listado de cierres mensuales o periódicos |
| `POST` | `/api/admin/finanzas/periodos` | `ADMIN` | Congela las métricas del periodo (ingresos, costos, utilidad neta) |
| `POST` | `/api/admin/finanzas/periodos/:id/reabrir` | `ADMIN` | Reabre un periodo cerrado |

---

### 6.22 Reportes Financieros y de Ventas
Todos los endpoints requieren rol `ADMIN`:
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin/finanzas/reportes/estado-resultados` | Estado de Resultados / P&L (Ventas, COGS, Margen Bruto, Gastos, Utilidad Neta) |
| `GET` | `/api/admin/finanzas/reportes/flujo-caja` | Flujo de Caja (entradas, salidas y saldos netos por periodo) |
| `GET` | `/api/reportes` | Resumen ejecutivo de ventas |
| `GET` | `/api/reportes/ventas-diarias` | Serie cronológica de ventas por día |
| `GET` | `/api/reportes/ventas-mensuales` | Comparativa mensual |
| `GET` | `/api/reportes/productos-top` | Ranking de productos más vendidos |
| `GET` | `/api/reportes/variantes-top` | Ranking de tallas y colores más vendidos |
| `GET` | `/api/reportes/canales` | Desglose omnicanal (`WEB`, `WHATSAPP`, `TIENDA`, `APP_QR`) |
| `GET` | `/api/reportes/vendedores` | Desempeño y volumen por vendedor |
| `GET` | `/api/reportes/cancelaciones` | Auditoría de pedidos cancelados, fallidos y reembolsados |
| `GET` | `/api/reportes/inventario-rotacion` | Rotación de stock y días de inventario |

---

### 6.23 Notificaciones y Alertas
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/notificaciones/resumen` | `ADMIN`, `VENDEDOR` | KPIs de stock crítico, pedidos pendientes de pago, comprobantes por verificar y cajas abiertas |

---

### 6.24 Gestión de Usuarios Administrativos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/usuarios` | `ADMIN` | Listado maestro de usuarios |
| `POST` | `/api/usuarios` | `ADMIN` | Creación de empleado (`VENDEDOR` o `ADMIN`) con asignación de sucursal |
| `PUT` | `/api/usuarios/:id` | `ADMIN` | Actualización de rol, estado activo o sucursal de un empleado |

---

### 6.25 Uploads Multimedia
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/uploads/variantes` | `ADMIN` | Sube fotografía de prenda a Cloudinary (multipart/form-data, max 5 MB) |

---

### 6.26 Operaciones, Mantenimiento y Cron
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `PATCH` | `/api/admin/delivery-options` | `ADMIN` | Reemplaza atómicamente en MongoDB las opciones de recojo y couriers |
| `GET` | `/api/admin/ops/overview` | `ADMIN` | Panel de observabilidad técnica y alertas de consistencia |
| `POST` | `/api/admin/ops/verify-core` | `ADMIN` | Test E2E de verificación del núcleo transaccional |
| `GET` | `/api/admin/audit-events` | `ADMIN` | Consulta de la pista de auditoría inmutable de eventos de dominio |
| `GET/POST`| `/api/admin/cron/reservas-expiradas`| Cron Secret | Proceso desatendido que libera stock de pedidos vencidos con candado distribuido `CronLock` |

---

## 7. Variables de Entorno

| Variable | Uso |
|---|---|
| `MONGODB_URL` | Cadena de conexión principal a MongoDB |
| `JWT_SECRET` | Clave simétrica para firmar y validar tokens JWT Bearer |
| `JWT_EXPIRES_IN` | Tiempo de vida del token de sesión móvil (ej. `1d`) |
| `NEXTAUTH_SECRET` | Secreto para encriptar sesiones web de NextAuth |
| `NEXTAUTH_URL` | URL base de la web para callbacks de NextAuth |
| `WHATSAPP_INTEGRATION_API_KEY` | Clave estática para autenticar llamadas del Agente WhatsApp |
| `CRON_SECRET` | Secreto Bearer para autorizar ejecuciones del cron de reservas |
| `CLOUDINARY_CLOUD_NAME` | Identificador de Cloudinary |
| `CLOUDINARY_API_KEY` | Llave pública de Cloudinary |
| `CLOUDINARY_API_SECRET` | Llave privada de Cloudinary |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram para notificaciones y links de 1 clic |
| `TELEGRAM_CHAT_ID` | Identificador del chat o canal administrativo de Telegram |
| `NEXT_PUBLIC_APP_URL` | URL base pública para generar enlaces de verificación |
| `BACKUP_ENABLED` | Activa o desactiva la política de copias de seguridad de ops |
