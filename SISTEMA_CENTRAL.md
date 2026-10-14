# MANUAL DE INTEGRACIÓN Y ARQUITECTURA DEL SISTEMA CENTRAL
## Fit Andes - Control Ventas (`control-ventas`)

> **Propósito de este documento:**  
> Esta es la **fuente única de verdad técnica (SSOT)** del backend central para que cualquier agente de desarrollo o inteligencia artificial (agente de la tienda web, agente de la aplicación móvil iOS/Android, bot/agente de WhatsApp, microservicios o integraciones externas) comprenda la arquitectura completa, modelos de datos, ciclos de vida, reglas de negocio, endpoints y mecanismos de seguridad del sistema.

---

## 1. Visión General del Sistema Central

### 1.1 Rol y Responsabilidades
El proyecto `control-ventas` es el **núcleo transaccional y operativo** del negocio de indumentaria **Fit Andes**. Centraliza:
1. **Catálogo Maestro y Variantes:** Gestión de prendas (chompas, ropa deportiva), variantes por color/talla/medidas, precios y SKUs.
2. **Inventario Multicentral y Multitienda:** Control de existencias físicas y reservadas a nivel global y desglosadas por sucursal (`NivelStock`), kárdex físico y contable valorado.
3. **Gestión Unificada de Pedidos (Omnicanalidad):** Procesamiento de órdenes generadas desde la Web, App Móvil (POS/QR), Tienda Física y WhatsApp.
4. **Cobranzas y Pasarela QR:** Verificación de pagos en efectivo y transferencias QR (BancoSol), recepción de comprobantes y validación manual con enlaces seguros hacia Telegram.
5. **Logística y Fulfillment:** Entregas en puntos de recojo programados y despachos por couriers nacionales a los 9 departamentos de Bolivia.
6. **Módulo POS y Arqueo de Cajas:** Apertura, control de turnos, registro de movimientos manuales de caja (ingresos/egresos) y arqueo ciego o supervisado.
7. **Finanzas y Tesorería:** Registro de cuentas de dinero (cajas y bancos), gastos, traspasos entre sucursales, compras con cálculo de Costo Promedio Ponderado (CPP), devoluciones y estados de resultados (P&L).
8. **Auditoría y Observabilidad:** Trazabilidad de operaciones críticas con `EventoAuditoria`, rate limiting en memoria y cron de liberación de reservas expiradas.

### 1.2 Clientes y Consumidores Satélites
```mermaid
graph TD
    subgraph "Canales y Agentes Satélites"
        WA["🤖 Agente WhatsApp<br/>(Bot / Conversacional AI)"]
        APP["📱 App Móvil<br/>(Vendedores / POS / Clientes)"]
        WEB["🌐 Web Storefront<br/>(E-commerce Clientes)"]
        DASH["💻 Dashboard Web<br/>(Admin & Vendedores)"]
        CRON["⏰ Cron Externo / Servidores<br/>(Vercel Cron / GitHub Actions)"]
    end

    subgraph "SISTEMA CENTRAL (Next.js 15 + MongoDB)"
        AUTH["Seguridad & Auth<br/>(JWT Bearer / NextAuth / API Key)"]
        ROUTER["API Routes (/api/*)<br/>Next.js App Router"]
        SERVICES["Capa de Servicios de Dominio<br/>(Orders, Stock, Payments, Finance)"]
        DB[(MongoDB Replicaset<br/>Mongoose + Transacciones ACID)]
    end

    subgraph "Servicios Externos"
        CLD["☁️ Cloudinary<br/>(Imágenes & Comprobantes)"]
        TG["✈️ Telegram Bot<br/>(Alertas & Links Un Solo Uso)"]
    end

    WA -->|"API Key Bearer"| ROUTER
    APP -->|"JWT Bearer"| ROUTER
    WEB -->|"NextAuth / Bearer"| ROUTER
    DASH -->|"NextAuth Session"| ROUTER
    CRON -->|"Cron Secret Bearer"| ROUTER

    ROUTER --> AUTH
    AUTH --> SERVICES
    SERVICES --> DB
    SERVICES --> CLD
    SERVICES --> TG
```

### 1.3 Stack Tecnológico del Backend
- **Framework:** Next.js 15.5.x (App Router, runtime `nodejs`).
- **Lenguaje:** TypeScript 5.x.
- **Base de Datos:** MongoDB vía Mongoose 8.x con soporte de transacciones ACID (`runInTransaction` sobre ReplicaSet).
- **Validación de Esquemas:** Zod 4.x / 3.x.
- **Autenticación:** Híbrida:
  - Web interna: `NextAuth` (v4) con cookies HTTP-only y tokens JWT.
  - Móvil / Integraciones externas: JWT firmado (`jsonwebtoken`) con clave simétrica `JWT_SECRET`.
  - Agente WhatsApp: Token Bearer estático verificado con `crypto.timingSafeEqual`.
  - Cron: Token Bearer con `CRON_SECRET`.
- **Almacenamiento Multimedia:** Cloudinary (SDK `next-cloudinary` / API v2).
- **Notificaciones Inmediatas:** Bot de Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
- **Formatos y Fechas:** JSON (`application/json`), multipart/form-data para comprobantes e imágenes, Fechas en estándar ISO 8601 en la zona horaria **`America/La_Paz` (UTC-4)**.

---

## 2. Entornos, URLs y Convenciones

### 2.1 Ambientes
| Entorno | Base URL API | Uso Principal |
|---|---|---|
| **Desarrollo Local** | `http://localhost:3000/api` | Pruebas locales y desarrollo de agentes |
| **Producción** | `https://control-ventas-azure.vercel.app/api` | API Central en producción en Vercel |

### 2.2 Convenciones de Identificadores y Prefijos
El sistema genera identificadores semánticos ordenados temporalmente mediante `generateOrderedId`:
- Pedidos: `P-YYMMDD-XXXX` (ej. `P-261014-001` o `P1728864000123`)
- Pagos: `PAGO-...` o `P-1728864...`
- Compras: `CMP-YYYY-XXXX`
- Traspasos: `TRF-YYYY-XXXX`
- Devoluciones: `DEV-...`
- Moneda oficial: **Bolivianos (`BOB` / `Bs`)**.

### 2.3 Manejo de Errores Estándar
Todas las rutas de la API devuelven errores consistentes:
```json
{
  "message": "Descripción clara del error",
  "code": "CODIGO_OPCIONAL_DE_DOMINIO"
}
```
En errores de validación de esquemas (Zod):
```json
{
  "message": "Datos invalidos",
  "errors": [
    { "field": "delivery.department", "message": "El departamento es requerido para envío nacional" },
    { "field": "items.0.cantidad", "message": "La cantidad debe ser al menos 1" }
  ]
}
```

---

## 3. Autenticación, Roles y Seguridad

### 3.1 Mecanismos de Autenticación
El sistema utiliza una estrategia de resolución de identidad desacoplada (`resolveApiAuth` y `requireApiAuth`):

```mermaid
flowchart TD
    Req[Petición Entrante HTTP] --> MW[Next.js Middleware]
    MW --> RL{Pasa Rate Limit?}
    RL -- No --> R429[HTTP 429 Too Many Requests]
    RL -- Sí --> AuthType{Tipo de Cliente / Header}

    AuthType -- "Header Authorization: Bearer <API_KEY>" --> WA_Auth[WhatsApp Integration Service<br/>Verifica timingSafeEqual]
    AuthType -- "Header Authorization: Bearer <JWT>" --> JWT_Auth[resolveApiAuth()<br/>jwt.verify con JWT_SECRET]
    AuthType -- "Cookies NextAuth (Dashboard)" --> Cookie_Auth[Middleware valida sesión<br/>Inyecta x-user-id / x-user-role]

    JWT_Auth --> DB_Check{Usuario activo en DB?}
    DB_Check -- Sí --> ExecuteRoute[Ejecuta Controlador de API]
    DB_Check -- No --> R401[HTTP 401 No autenticado]

    Cookie_Auth --> ExecuteRoute
    WA_Auth --> ExecuteRoute
```

#### A. Para Aplicaciones Móviles (App Flutter / React Native):
1. Iniciar sesión en `POST /api/auth/login` con `{ "email": "...", "password": "..." }`.
2. Almacenar el `accessToken` recibido.
3. En cada petición subsiguiente, enviar la cabecera:
   ```http
   Authorization: Bearer <accessToken>
   ```

#### B. Para el Agente WhatsApp:
El bot de WhatsApp consume endpoints dedicados en `/api/integrations/whatsapp/*` y utiliza una clave secreta fija configurada en `WHATSAPP_INTEGRATION_API_KEY`:
```http
Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>
```

#### C. Para el Dashboard Web:
Utiliza la sesión de `NextAuth`. El middleware inyecta de forma segura los encabezados `x-user-id` y `x-user-role` una vez validada la cookie `httpOnly`. Si una petición externa intenta inyectar fraudulentamente estos encabezados, el middleware los elimina automáticamente para evitar spoofing.

### 3.2 Matriz de Roles
| Rol | Ámbito | Capacidades |
|---|---|---|
| `ADMIN` | Total | Gestión completa de usuarios, productos, finanzas, inventario, cierres de caja, reportes, ops y auditoría. |
| `VENDEDOR` | Operativo | Acceso al POS, escaneo de variantes, ventas directas, consulta de catálogo, solicitudes de traspaso, entregas. |
| `CLIENTE` | Externo / Personal | Carrito propio, checkout, ver sus propios pedidos (`/api/mis-pedidos`), actualizar sus direcciones y perfil. |
| `SYSTEM` | Proceso Cron / Webhook | Tareas de liberación de reservas, sincronización y auditoría interna. |

### 3.3 Rate Limiting en Memoria
El middleware protege las rutas con las siguientes cuotas:
- **Autenticación (`/api/auth/login`, `/signup`, `/login`):** Máximo 5 req/min por IP.
- **Catálogo Público (`/api/productos/publicos`):** Máximo 100 req/min por IP.
- **APIs de Lectura (`GET /api/*` protegidas):** 60 req/min por usuario autenticado (o IP).
- **APIs de Escritura (`POST/PUT/PATCH/DELETE /api/*`):** 30 req/min por usuario.
- *Respuesta si se excede:* Status `429`, body `{ "message": "Demasiadas solicitudes. Inténtalo más tarde." }` y cabecera `Retry-After: 60`.

---

## 4. Modelos de Datos Centrales (Diccionario de Entidades)

Todos los modelos residen en `src/models/*.ts` y persisten en MongoDB. A continuación se detallan las estructuras esenciales:

### 4.1 `Pedido` (`src/models/pedido.ts`)
Es el documento central de compra/venta omnicanal:
- **`numeroPedido`** (`String`, único): Ej. `P-261014-001`.
- **`canal`** (`Enum`): `["WEB", "APP_QR", "TIENDA", "WHATSAPP"]`.
- **`estadoPedido`** (`Enum`):  
  `"PENDING_PAYMENT"` | `"CONFIRMED"` | `"PREPARING"` | `"READY"` | `"IN_TRANSIT"` | `"DELIVERED"` | `"CANCELLED"`.
- **`estadoPago`** (`Enum`): `"PENDING"` | `"PAID"` | `"FAILED"` | `"REFUNDED"`.
- **`estadoEntrega`** (`Enum`): `"PENDING"` | `"READY"` | `"IN_TRANSIT"` | `"DELIVERED"` | `"NOT_APPLICABLE"` | `"CANCELLED"`.
- **`estadoReservaStock`** (`Enum`): `"NONE"` | `"RESERVED"` | `"CONSUMED"` | `"RELEASED"`.
- **`reservadoEn`** (`Date`): Fecha de inicio de reserva temporal.
- **`reservaExpiraEn`** (`Date`): Fecha límite tras la cual el cron liberará el stock.
- **`metodoPago`** (`Enum`): `"EFECTIVO"` | `"QR"`.
- **`cliente`** (`ObjectId`, ref `User`, opcional): Si está autenticado.
- **`vendedor`** (`ObjectId`, ref `User`, opcional): Empleado que procesó la venta.
- **`sucursalId`** (`ObjectId`, ref `Sucursal`, opcional): Tienda/almacén de donde sale el producto.
- **`items`** (`Array`):
  - `productoId`: `ObjectId`.
  - `variante`: `{ varianteId, color, colorSecundario, talla, codigoBarra, qrCode }`.
  - `productoSnapshot`: `{ nombre, modelo, sku, imagen }`.
  - `cantidad`: `Number` (>= 1).
  - `precioUnitario`: `Number`.
  - `totalLinea`: `Number`.
  - `precioCosto`: `Number`.
  - `ganancia`: `Number`.
- **`subtotal`**, **`costoEnvio`**, **`descuento`**, **`total`**, **`gananciaTotal`** (`Numbers`).
- **`snapshotCliente`**: `{ usuarioId, nombreCompleto, email, telefono, tipoDocumento, numeroDocumento }`.
- **`snapshotEntrega`**:
  - `metodo`: `"PICKUP_POINT"` | `"SHIPPING_NATIONAL"` | `"WHATSAPP"`.
  - Recojo: `puntoRecojo`, `horarioRecojo`, `programadoPara`, `nombreDestinatario`, `telefono`.
  - Envío Nacional: `departamento`, `ciudad`, `empresaEnvio`, `sucursal`, `nombreRemitente`, `ciRemitente`, `telefonoRemitente`.
- **`idempotencyKey`** (`String`, único y sparse): Evita pedidos duplicados por desconexión o reintentos de bots.

### 4.2 `TransaccionPago` (`src/models/transaccionPago.ts`)
Representa el estado financiero de una orden:
- **`numeroPago`** (`String`, único).
- **`pedidoId`** (`ObjectId`, ref `Pedido`).
- **`metodoPago`** (`"EFECTIVO"` | `"QR"`).
- **`monto`** (`Number`).
- **`estado`** (`"PENDING"` | `"PAID"` | `"FAILED"` | `"REFUNDED"`).
- **`urlComprobante`** (`String`, URL Cloudinary): Captura del comprobante subido por cliente o bot.
- **`tokenRevisionHash`** (`String`): Hash SHA-256 del token uniuso enviado a Telegram para aprobación de un solo clic.
- **`tokenRevisionExpiresAt`** (`Date`): Vencimiento del link (48 horas).
- **`tokenRevisionUsado`** (`Boolean`): Bandera para garantizar uso único.

### 4.3 `Entrega` (`src/models/entrega.ts`)
Documento de control logístico (sincronizado con `Pedido`):
- **`pedidoId`** (`ObjectId`, único).
- **`estado`** (`"PENDING"` | `"READY"` | `"IN_TRANSIT"` | `"DELIVERED"` | `"NOT_APPLICABLE"` | `"CANCELLED"`).
- **`codigoSeguimiento`** (`String`): Número de guía del transportista nacional.
- **`nombreTransportista`** (`String`): Ej. "Trans Copacabana", "Bolivar".
- **`asignadoA`** (`ObjectId`, ref `User`): Repartidor o encargado de tienda.
- **Marcas temporales:** `preparadoEn`, `enTransitoEn`, `entregadoEn`, `canceladoEn`.

### 4.4 `Producto` y Variantes (`src/models/producto.ts`)
- **`nombre`**, **`modelo`**, **`categoria`**, **`descripcion`**, **`marca`**.
- **`sku`** (`String`, único e inmutable): Código general del producto.
- **`precioVenta`**, **`precioCosto`**, **`descuento`**.
- **`costoOrigen`**: Moneda de compra (`PEN`, `BOB`, `USD`), tipo de cambio y fecha.
- **`stockTotal`** (`Number`): Calculado automáticamente mediante pre-save sumando el stock de todas las variantes.
- **`variantes`** (`Array`):
  - `varianteId`: Identificador único (UUID o ObjectId string).
  - `color`, `colorSecundario`, `talla`.
  - `stock`: Stock físico total disponible.
  - `stockReservado`: Stock en proceso de compra aún no confirmado.
  - `codigoBarra`, `qrCode`: Escaneables desde la app móvil o POS.
  - `imagenes`: Array de URLs Cloudinary.
  - `medidas`: `{ anchoPecho, anchoHombros, largoTotal, largoMangaAxila, largoMangaHombro }`.

### 4.5 `NivelStock` (`src/models/nivelStock.ts`)
Controla el stock atómico desglosado por sucursal física:
- Índice único compuesto: `{ sucursalId: 1, varianteId: 1 }`.
- **`stockFisico`**: Unidades presentes físicamente en la sucursal.
- **`stockReservado`**: Unidades comprometidas en órdenes pendientes.
- **`stockMinimo`**: Umbral de alerta para reabastecimiento.
- *Fórmula de Stock Disponible:* `Math.max(0, stockFisico - stockReservado)`.

### 4.6 `Inventario` / Kárdex (`src/models/inventario.ts`)
Registro de auditoría física y valorada:
- **`tipo`**: `"ENTRADA"` | `"SALIDA"` | `"AJUSTE"` | `"DEVOLUCION"` | `"TRASPASO_SALIDA"` | `"TRASPASO_ENTRADA"`.
- **`cantidad`**, **`stockAnterior`**, **`stockActual`**.
- **`costoUnitario`**, **`valorTotalOperacion`**, **`costoPromedioResultante`**, **`saldoValorado`**.

### 4.7 `SesionCaja` (`src/models/sesionCaja.ts`)
Gestiona los turnos de venta y arqueo POS:
- **`sucursalId`**, **`cuentaDineroId`**, **`usuarioAperturaId`**, **`usuarioCierreId`**.
- **`montoApertura`**, **`totalVentasEfectivo`**, **`totalVentasQR`**, **`totalVentasTarjeta`**.
- **`totalIngresosManuales`**, **`totalEgresosManuales`**.
- **`montoEsperadoEfectivo`**, **`montoDeclaradoEfectivo`**, **`diferenciaEfectivo`** (descuadre).
- **`estado`**: `"ABIERTA"` | `"CERRADA"`.

### 4.8 `CuentaDinero` y `MovimientoCuenta`
Cuentas bancarias o de efectivo (`CAJA_FISICA`, `BANCO`, `BILLETERA_QR`, `PASARELA`). Todo cobro, gasto, compra o reembolso genera un movimiento contable inmutable con `saldoAnterior` y `saldoPosterior`.

### 4.9 `DeliveryOptions` (`src/models/deliveryOptions.ts`)
Configuración editable por el administrador:
- `pickupPoints`: Puntos de encuentro habilitados en La Paz (ej. estaciones de Mi Teleférico, locales).
- `pickupSchedules`: Días y rangos horarios habilitados.
- `shippingCompanies`: Empresas de envío con su lista de departamentos y agencias disponibles.

---

## 5. Máquinas de Estado y Ciclos de Vida

### 5.1 Ciclo de Vida del Pedido y Transiciones de Estado
```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : Pedido creado (Web / WhatsApp / App QR)<br/>Stock: RESERVED

    PENDING_PAYMENT --> CONFIRMED : Pago confirmado (Efectivo/QR/Telegram)<br/>Stock: CONSUMED (Kardex SALIDA)
    PENDING_PAYMENT --> CANCELLED : Cron expira reserva (15m-48h) o Cancelación manual<br/>Stock: RELEASED

    CONFIRMED --> PREPARING : Staff empaqueta pedido
    PREPARING --> READY : Listo para retiro en punto o courier
    READY --> IN_TRANSIT : En camino / Transportista asignado
    IN_TRANSIT --> DELIVERED : Entregado al cliente
    
    [*] --> DELIVERED : Venta Directa Mostrador (POS)<br/>Pago inmediato, Stock: CONSUMED
```

#### Reglas Inmutables de Estado:
1. **Consumo de Stock:** Solo se descuenta del stock físico (`stockFisico - cantidad`) y se registra en el Kárdex (`SALIDA`) cuando el pago pasa a `PAID` o si es una venta directa POS.
2. **Liberación de Stock:** Si el pedido se cancela o expira, `stockReservado` se decrementa devolviendo la disponibilidad al catálogo.
3. **Bloqueo Logístico:** No se puede avanzar el estado logístico a `READY`, `IN_TRANSIT` o `DELIVERED` si `estadoPago` no es `PAID`.

### 5.2 Tiempos de Reserva y Cron de Expiración
- **Pedidos Web (QR):** Reserva válida por **30 minutos**.
- **Pedidos Web (Efectivo / WhatsApp):** Reserva extendida a **48 horas**.
- **Pedidos WhatsApp:** Reserva válida hasta el **final del día programado** (`23:59:59.999` hora de Bolivia, UTC-4) para el recojo/envío. Si sube comprobante, se prorroga **48 horas adicionales** mientras el administrador lo verifica.
- **Ruta del Cron:** `GET/POST /api/admin/cron/reservas-expiradas` (requiere `Authorization: Bearer <CRON_SECRET>`). Adquiere un candado distribuido en `CronLock` para evitar condiciones de carrera entre múltiples workers.

---

## 6. Guía para el Agente WhatsApp (Chatbot Conversacional)

El agente de WhatsApp interactúa como un asistente de ventas inteligente. Dispone de endpoints dedicados y optimizados.

### 6.1 Autenticación del Bot
Todas las llamadas deben incluir la cabecera:
```http
Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>
Content-Type: application/json
```

### 6.2 Flujo Operativo del Agente WhatsApp
```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente (WhatsApp)
    participant Bot as 🤖 Agente WhatsApp
    participant API as 🖥️ Sistema Central API
    participant TG as ✈️ Admin Telegram
    
    Cliente->>Bot: "Hola, quiero la chompa Alpaca Negra Talla L para recoger el viernes"
    Bot->>API: GET /api/productos/publicos?busqueda=Alpaca
    API-->>Bot: Retorna producto, variantes y stock disponible
    Bot->>API: GET /api/delivery-options
    API-->>Bot: Retorna puntos de recojo y empresas de envío
    Bot->>Cliente: "Tenemos stock. Recojo en Estación Teleférico Central. Total Bs 120. ¿Confirmas?"
    Cliente->>Bot: "Sí, confirmo"
    Bot->>API: POST /api/integrations/whatsapp/orders (con idempotencyKey)
    API-->>Bot: Retorna numeroPedido, QR BancoSol y fecha límite de reserva
    Bot->>Cliente: Muestra imagen QR de BancoSol e instrucciones de pago
    Cliente->>Bot: Envía imagen del comprobante
    Bot->>API: POST /api/integrations/whatsapp/payments/{paymentId}/proof (multipart/form-data)
    API->>TG: Notifica comprobante con enlace de verificación segura de 1 clic
    API-->>Bot: Comprobante registrado, reserva extendida 48h
    Bot->>Cliente: "Comprobante recibido. En breve te confirmamos el pedido."
    TG->>API: Admin presiona "Confirmar Pago" en el link seguro
    API->>API: Pedido pasa a CONFIRMED, stock pasa a CONSUMED
```

### 6.3 Especificación de Endpoints para WhatsApp

#### 1. Crear Pedido desde WhatsApp
- **Endpoint:** `POST /api/integrations/whatsapp/orders`
- **Headers:** `Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>`
- **Payload:**
```json
{
  "idempotencyKey": "wa-59167113105-1728864000",
  "customer": {
    "phone": "59167113105",
    "name": "Juan Perez"
  },
  "items": [
    {
      "productoId": "650000000000000000000001",
      "varianteId": "650000000000000000000002",
      "cantidad": 1
    }
  ],
  "paymentMethod": "QR",
  "delivery": {
    "method": "PICKUP_POINT",
    "scheduledFor": "2026-10-18T15:00:00-04:00",
    "pickupPointId": "teleferico-central",
    "pickupScheduleId": "sab-14-16",
    "recipientName": "Juan Perez",
    "phone": "59167113105"
  },
  "notes": "Cliente solicita empaque de regalo"
}
```
*Si fuera Envío Nacional (`method: "SHIPPING_NATIONAL"`):*
```json
"delivery": {
  "method": "SHIPPING_NATIONAL",
  "scheduledFor": "2026-10-18T10:00:00-04:00",
  "department": "Cochabamba",
  "city": "Cochabamba",
  "shippingCompanyId": "bolivar-cargo",
  "branch": "Terminal Central Cochabamba",
  "recipientName": "Juan Perez",
  "recipientCi": "4589231 CB",
  "phone": "59167113105"
}
```
*Respuesta Exitosa (HTTP 201):*
```json
{
  "numeroPedido": "P-261014-045",
  "pedidoId": "665f...",
  "pagoId": "665f...",
  "subtotal": 120,
  "costoEnvio": 0,
  "descuento": 0,
  "total": 120,
  "estado": "PENDING_PAYMENT",
  "vencimientoReserva": "2026-10-19T03:59:59.999Z",
  "paymentInstructions": {
    "method": "QR",
    "bank": "BancoSol",
    "accountHolder": "Fernando Leon Andrade Gutierrez",
    "qrImageUrl": "https://res.cloudinary.com/dq1jeikev/image/upload/v1777964054/comprobante_xvdhuf.jpg",
    "amount": 120,
    "message": "Realiza el pago por QR y envía aquí la captura de tu comprobante."
  },
  "notification": {
    "to": "59167113105",
    "type": "NEW_ORDER",
    "text": "..."
  }
}
```

#### 2. Subir Comprobante de Pago desde WhatsApp
- **Endpoint:** `POST /api/integrations/whatsapp/payments/{paymentId}/proof`
- **Content-Type:** `multipart/form-data`
- **Body:** campo `file` con el binario de la imagen (JPG/PNG, máximo 5 MB).
- **Efecto:**
  1. Sube la imagen a Cloudinary en `control-ventas/comprobantes`.
  2. Genera un `tokenRevision` uniuso (SHA-256) y lo guarda en `TransaccionPago`.
  3. Extiende la reserva del pedido por 48 horas.
  4. Envía un mensaje con foto y botones interactivos al Telegram del Administrador.
- **Respuesta (HTTP 200):**
```json
{
  "message": "Comprobante registrado exitosamente. El administrador fue notificado para su verificación.",
  "paymentId": "665f...",
  "urlComprobante": "https://res.cloudinary.com/...",
  "verifyUrl": "https://control-ventas-azure.vercel.app/verificar/pago/{tokenRevision}"
}
```

#### 3. Consultar Estado de Pedido desde WhatsApp
- **Endpoint:** `GET /api/integrations/whatsapp/orders/{numeroPedido}?phone=59167113105`
- **Seguridad:** Requiere que el teléfono consultado coincida con el cliente o el destinatario.
- **Respuesta:**
```json
{
  "numeroPedido": "P-261014-045",
  "createdAt": "2026-10-14T02:00:00.000Z",
  "estadoPedido": "CONFIRMED",
  "estadoPago": "PAID",
  "estadoEntrega": "READY",
  "estadoReservaStock": "CONSUMED",
  "subtotal": 120,
  "total": 120,
  "entrega": {
    "metodo": "PICKUP_POINT",
    "puntoRecojo": "Estación Teleférico Central"
  }
}
```

---

## 7. Guía para el Agente de la App Móvil (Android / iOS / Flutter / React Native)

La aplicación móvil es utilizada tanto por clientes como por personal de ventas en tienda (`VENDEDOR` y `ADMIN`).

### 7.1 Autenticación Móvil
1. **Login de Vendedor/Cliente:**
   `POST /api/auth/login` con body `{ "email": "...", "password": "..." }`.
   Respuesta contiene: `{ "accessToken": "...", "user": { "id": "...", "rol": "VENDEDOR", ... } }`.
2. **Uso de Token:** Adjuntar `Authorization: Bearer <accessToken>` en cada petición HTTP.
3. **Expiración:** El token tiene vigencia de 1 día (`JWT_EXPIRES_IN=1d`). En caso de recibir `401`, redirigir a pantalla de login.

### 7.2 Flujo del Módulo POS y Escáner (Vendedores)
1. **Verificar Caja Abierta al Iniciar el Día:**
   - `GET /api/pos/caja/activa?sucursalId={id}`:
     Si no hay caja abierta, la app debe obligar a abrir turno:
     `POST /api/pos/caja/apertura` con `{ "sucursalId": "...", "montoApertura": 100, "notasApertura": "Inicio de turno" }`.
2. **Escaneo de Código de Barras o QR en Mostrador:**
   - `GET /api/pos/scan/{code}?sucursalId={sucursalId}`:
     Responde instantáneamente con el producto, la variante exacta encontrada, precio y el `stockSucursal` actual.
3. **Completar Venta Directa en Mostrador:**
   - `POST /api/pos/sales`:
   ```json
   {
     "sucursalId": "650000000000000000000009",
     "metodoPago": "EFECTIVO", // o "QR"
     "descuento": 0,
     "items": [
       {
         "productoId": "650000000000000000000001",
         "varianteId": "650000000000000000000002",
         "cantidad": 1,
         "precioUnitario": 120
       }
     ]
   }
   ```
   *Efecto Automático del POS:*
   - Se crea el `Pedido` con estado `DELIVERED`, pago `PAID` y stock `CONSUMED`.
   - Se descuenta el stock de la sucursal en `NivelStock` y catálogo.
   - Se registra el movimiento de `SALIDA` en el Kárdex.
   - Se ingresa el dinero en la `CuentaDinero` de caja y se suma a `totalVentasEfectivo` o `totalVentasQR` de la `SesionCaja` activa.
4. **Cierre de Caja y Arqueo al Fin de Turno:**
   - `POST /api/pos/caja/cierre`:
     Envía `{ "sucursalId": "...", "montoDeclaradoEfectivo": 1250, "notasCierre": "Arqueo sin novedades" }`.
     El sistema calcula la diferencia entre lo esperado por sistema y lo declarado.

---

## 8. Guía para el Agente de la Web (Storefront y Checkout)

### 8.1 Carrito Persistente del Cliente
- `GET /api/carrito`: Obtiene los productos en el carrito del usuario autenticado con validación de stock disponible en tiempo real.
- `POST /api/carrito/items`: Añade un ítem `{ productoId, varianteId, color, colorSecundario, talla, cantidad }`.
- `PATCH /api/carrito/items/{itemId}`: Actualiza la cantidad.
- `DELETE /api/carrito/items/{itemId}`: Remueve un ítem.

### 8.2 Checkout Web
- `POST /api/pedidos/checkout`:
```json
{
  "metodoPago": "QR",
  "direccionId": "650000000000000000000010", // Opcional si ya tiene dirección guardada
  "entrega": {
    "metodo": "PICKUP_POINT",
    "direccion": "Estación Teleférico Central",
    "telefono": "76543210",
    "nombreDestinatario": "María Gómez",
    "programadoPara": "2026-10-20"
  }
}
```
*Comportamiento:*
1. Vacía el carrito del usuario.
2. Bloquea el stock en modo `RESERVED` por 30 minutos.
3. Genera la transacción `TransaccionPago` en estado `PENDING`.
4. El frontend muestra la pantalla con el código QR de BancoSol.

### 8.3 Subida de Comprobante desde la Web
- `POST /api/pagos/{id}/upload-comprobante`:
  Sube la imagen del comprobante por `multipart/form-data`, notifica al administrador en Telegram con el token uniuso y actualiza el pedido a espera de validación.

---

## 9. Inventario Multitienda, Kárdex y Compras

### 9.1 Traspasos entre Sucursales (`Traspaso`)
Para mover mercadería de un almacén central a una tienda física:
1. **Solicitud:** `POST /api/admin/traspasos` (`estado: "SOLICITADA"`). Valida que la sucursal de origen tenga stock suficiente.
2. **Despacho:** `POST /api/admin/traspasos/{id}/despachar` (`estado: "EN_TRANSITO"`).
   - Descuenta stock de origen en `NivelStock`.
   - Crea asiento de kárdex `TRASPASO_SALIDA`.
3. **Recepción:** `POST /api/admin/traspasos/{id}/recibir` (`estado: "RECIBIDA"`).
   - Incrementa stock en la sucursal de destino.
   - Crea asiento de kárdex `TRASPASO_ENTRADA`.
   - Si hubo faltantes/daños, se registran en `notasItem` y cantidades recibidas.

### 9.2 Compras a Proveedores y Costo Promedio Ponderado (CPP)
- `POST /api/compras`: Registra la compra de prendas (con soporte de moneda origen `PEN`, `USD` o `BOB`).
- **Fórmula de Recálculo CPP:**
  $$\text{Nuevo Costo Promedio} = \frac{(\text{Stock Anterior} \times \text{Costo Anterior}) + (\text{Cantidad Nueva} \times \text{Costo Nuevo BOB})}{\text{Stock Total Resultante}}$$
- Actualiza el `precioCosto` de la variante y del producto.
- Genera movimiento `ENTRADA` en kárdex con saldos valorados.
- Si se asocia a una `cuentaDineroId`, descuenta el egreso del banco/caja automáticamente.

### 9.3 Devoluciones y Cambios (`DevolucionCambio`)
- `POST /api/pedidos/{id}/devoluciones`:
  - Permite devolución total o cambio de prenda.
  - Destino físico configurable: `REINGRESO_STOCK` (vuelve al inventario vendible) o `MERMA_DANADO` (prenda rota/manchada no vendible).
  - Acción monetaria: `REEMBOLSO_CLIENTE` (egreso de caja), `COBRO_ADICIONAL` (ingreso por prenda de mayor valor) o `NINGUNO`.

---

## 10. Catálogo Rápido de Rutas de la API

| Método | Ruta | Roles Permitidos | Propósito Principal |
|---|---|---|---|
| **POST** | `/api/auth/login` | Público | Autenticación email/password, emite JWT Bearer |
| **POST** | `/api/auth/signup` | Público | Registro de nuevos clientes |
| **POST** | `/api/auth/google` | Público | Login con Google OAuth token |
| **GET** | `/api/productos/publicos` | Público | Catálogo con filtros de búsqueda, categoría, stock disponible |
| **GET** | `/api/productos/publicos/{id}` | Público | Detalle de producto con variantes y medidas |
| **GET** | `/api/delivery-options` | Público | Opciones dinámicas de recojo y couriers nacionales |
| **GET** | `/api/public/politicas` | Público | Términos, condiciones y políticas de devolución |
| **GET/POST** | `/api/carrito` | `CLIENTE` | Consultar o limpiar carrito de compras |
| **POST** | `/api/carrito/items` | `CLIENTE` | Agregar ítem al carrito con validación de stock |
| **PATCH/DEL** | `/api/carrito/items/{itemId}` | `CLIENTE` | Modificar cantidad o eliminar ítem del carrito |
| **POST** | `/api/pedidos/checkout` | `CLIENTE` | Crear pedido desde carrito y reservar stock |
| **GET** | `/api/mis-pedidos` | `CLIENTE` | Historial de compras del cliente autenticado |
| **GET** | `/api/pedidos` | `ADMIN`, `VENDEDOR` | Listado maestro operativo de órdenes |
| **GET/PATCH** | `/api/pedidos/{id}` | `ADMIN`, `VENDEDOR`, `CLIENTE`* | Ver o actualizar orden (*cliente solo su pedido) |
| **POST** | `/api/pedidos/{id}/confirm-cash` | `ADMIN`, `VENDEDOR` | Confirmar cobro en efectivo y consumir stock |
| **POST** | `/api/pedidos/{id}/confirm-for-delivery` | `ADMIN`, `VENDEDOR` | Aprobar para despacho o recojo |
| **POST** | `/api/pedidos/{id}/devoluciones` | `ADMIN`, `VENDEDOR` | Registrar devolución o cambio de prenda |
| **POST** | `/api/pagos/{id}/upload-comprobante` | `CLIENTE`, `ADMIN` | Subir comprobante y disparar revisión en Telegram |
| **POST** | `/api/pagos/{id}/confirm` | `ADMIN`, `VENDEDOR` | Confirmación manual de pago y consumo de stock |
| **POST** | `/api/pagos/{id}/refund` | `ADMIN` | Reembolso y reversión financiera |
| **GET** | `/api/verificar/pago/{token}` | Personal Staff | Vista segura uniuso de comprobante recibido |
| **POST** | `/api/verificar/pago/{token}/confirm` | Personal Staff | Aprobación en 1 clic del pago vía Telegram link |
| **POST** | `/api/verificar/pago/{token}/reject` | Personal Staff | Rechazo de comprobante falso o ilegible |
| **GET** | `/api/pos/scan/{code}` | `ADMIN`, `VENDEDOR` | Búsqueda rápida por código de barra o QR |
| **POST** | `/api/pos/sales` | `ADMIN`, `VENDEDOR` | Registrar venta directa en mostrador |
| **GET** | `/api/pos/caja/activa` | `ADMIN`, `VENDEDOR` | Consultar si hay turno de caja abierto |
| **POST** | `/api/pos/caja/apertura` | `ADMIN`, `VENDEDOR` | Apertura de turno con fondo inicial |
| **POST** | `/api/pos/caja/cierre` | `ADMIN`, `VENDEDOR` | Cierre de turno y arqueo de efectivo |
| **POST** | `/api/pos/caja/movimiento-manual` | `ADMIN`, `VENDEDOR` | Registrar ingreso/egreso menor de caja |
| **POST** | `/api/integrations/whatsapp/orders` | API Key Bot | Creación de pedidos WhatsApp con idempotencia |
| **POST** | `/api/integrations/whatsapp/payments/{id}/proof` | API Key Bot | Subida de comprobante desde chat WhatsApp |
| **GET** | `/api/integrations/whatsapp/orders/{nro}` | API Key Bot | Consulta de estado por número y teléfono |
| **GET** | `/api/admin/sucursales` | `ADMIN` | Listado y administración de tiendas físicas |
| **GET/POST** | `/api/admin/traspasos` | `ADMIN`, `VENDEDOR` | Solicitudes de movimiento de stock |
| **POST** | `/api/admin/traspasos/{id}/despachar` | `ADMIN`, `VENDEDOR` | Despacho de traspaso (salida de stock) |
| **POST** | `/api/admin/traspasos/{id}/recibir` | `ADMIN`, `VENDEDOR` | Recepción de traspaso (ingreso a tienda) |
| **GET/POST** | `/api/compras` | `ADMIN` | Registro de compras a proveedores con cálculo CPP |
| **GET** | `/api/notificaciones/resumen` | `ADMIN`, `VENDEDOR` | KPIs de alertas (stock bajo, pagos por verificar) |
| **GET/POST** | `/api/admin/cron/reservas-expiradas` | Cron Secret | Proceso automático de liberación de reservas |
| **GET** | `/api/admin/ops/overview` | `ADMIN` | Dashboard de salud del sistema, alertas y logs |
| **GET** | `/api/estado` | Público | Healthcheck técnico de conexión a MongoDB |

---

## 11. Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo / Formato |
|---|---|---|
| `MONGODB_URL` | URI de conexión a réplica de MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true` |
| `JWT_SECRET` | Clave secreta para firmar tokens Bearer | String hexadecimal aleatorio de 64+ caracteres |
| `JWT_EXPIRES_IN` | Duración del token de sesión móvil | `1d` |
| `NEXTAUTH_SECRET` | Clave para sesiones web de NextAuth | String aleatorio |
| `NEXTAUTH_URL` | URL base web del sistema | `http://localhost:3000` o `https://control-ventas-azure.vercel.app` |
| `WHATSAPP_INTEGRATION_API_KEY` | Token Bearer fijo para el bot de WhatsApp | `fit_andes_wa_secret_...` |
| `CRON_SECRET` | Secreto para proteger endpoints de Cron | `cron_secret_token_...` |
| `CLOUDINARY_CLOUD_NAME` | Cloud Name de Cloudinary | `dq1jeikev` |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | `767714819689957` |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary | `wgt3v_...` |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram para alertas | `8762661056:AAEM...` |
| `TELEGRAM_CHAT_ID` | ID del canal o chat de administradores | `1226712516` |
| `NEXT_PUBLIC_APP_URL` | URL pública para links generados | `https://control-ventas-azure.vercel.app` |

---

## 12. Reglas de Oro y Antipatrones para Agentes Satélites

### Lo que los Agentes Satélites DEBEN hacer:
1. **Enviar siempre `idempotencyKey`** al crear órdenes desde clientes móviles o bots para prevenir dobles compras si hay cortes de red.
2. **Respetar la Zona Horaria:** Todas las fechas operativas (`scheduledFor`, vencimientos) se rigen por la hora de Bolivia (`America/La_Paz`, UTC-4).
3. **Manejar códigos HTTP:** Reaccionar adecuadamente a `401` (re-login), `403` (falta de permisos), `409` (reserva expirada o stock insuficiente) y `429` (esperar 60 segundos por rate limit).
4. **Validar antes de enviar:** Enviar payloads limpios que cumplan con los esquemas Zod (por ejemplo, en envío nacional `department`, `city`, `shippingCompanyId`, `branch` y `recipientCi` son obligatorios).

### Lo que los Agentes Satélites NUNCA deben hacer:
1. **NUNCA manipular stock localmente:** El stock físico y reservado solo lo calcula el sistema central dentro de transacciones ACID.
2. **NUNCA dar un pedido por pagado sin confirmación del sistema central:** Un comprobante subido no significa pago aprobado; debe esperarse el estado `PAID`.
3. **NUNCA saltarse la validación de sucursales:** En operaciones POS o traspasos, cada movimiento debe ir atado a un `sucursalId` activo.
