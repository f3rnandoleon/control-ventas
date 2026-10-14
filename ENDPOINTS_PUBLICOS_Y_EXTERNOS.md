# CATÁLOGO Y GUÍA DE ENDPOINTS EXTERNOS Y PÚBLICOS
## Fit Andes - Sistema Central (`control-ventas`)

> **Audiencia de este documento:**  
> Agentes de programación e integradores de la **Tienda Web (Storefront)**, **Aplicación Móvil (iOS/Android/POS)**, **Bot/Agente Conversacional de WhatsApp** y **sistemas externos**.  
> Este documento detalla qué puede consultar o realizar cada sistema externo contra el backend central, acompañado de ejemplos completos de peticiones (cURL / JSON / FormData), respuestas exitosas y códigos de error.

---

## Índice Rápido
1. [Arquitectura de Integración y Base URLs](#1-arquitectura-de-integración-y-base-urls)
2. [Autenticación, Cabeceras y Rate Limiting](#2-autenticación-cabeceras-y-rate-limiting)
3. [Endpoints Públicos (Sin Autenticación)](#3-endpoints-públicos-sin-autenticación)
   - [3.1 Salud del Sistema (`GET /api/estado`)](#31-salud-del-sistema-get-apiestado)
   - [3.2 Catálogo Público (`GET /api/productos/publicos`)](#32-catálogo-público-get-apiproductospublicos)
   - [3.3 Detalle de Producto (`GET /api/productos/publicos/:id`)](#33-detalle-de-producto-get-apiproductospublicosid)
   - [3.4 Opciones de Entrega (`GET /api/delivery-options`)](#34-opciones-de-entrega-get-apidelivery-options)
   - [3.5 Políticas Legales (`GET /api/public/politicas`)](#35-políticas-legales-get-apipublicpoliticas)
4. [Autenticación y Gestión de Clientes](#4-autenticación-y-gestión-de-clientes)
   - [4.1 Registro de Cliente (`POST /api/auth/signup`)](#41-registro-de-cliente-post-apiauthsignup)
   - [4.2 Login JWT (`POST /api/auth/login`)](#42-login-jwt-post-apiauthlogin)
   - [4.3 Login Google (`POST /api/auth/google`)](#43-login-google-post-apiauthgoogle)
   - [4.4 Perfil Propio (`GET/PUT /api/clientes/me`)](#44-perfil-propio-getput-apiclientesme)
   - [4.5 Direcciones Guardadas (`GET/POST/DELETE /api/clientes/me/direcciones`)](#45-direcciones-guardadas-getpostdelete-apiclientesmedirecciones)
5. [Carrito de Compras Persistente](#5-carrito-de-compras-persistente)
   - [5.1 Obtener Carrito (`GET /api/carrito`)](#51-obtener-carrito-get-apicarrito)
   - [5.2 Agregar Ítem (`POST /api/carrito/items`)](#52-agregar-ítem-post-apicarritoitems)
   - [5.3 Modificar Cantidad (`PATCH /api/carrito/items/:itemId`)](#53-modificar-cantidad-patch-apicarritoitemsitemid)
   - [5.4 Eliminar Ítem (`DELETE /api/carrito/items/:itemId`)](#54-eliminar-ítem-delete-apicarritoitemsitemid)
   - [5.5 Vaciar Carrito (`DELETE /api/carrito`)](#55-vaciar-carrito-delete-apicarrito)
6. [Checkout y Pedidos Web/Móvil](#6-checkout-y-pedidos-web-móvil)
   - [6.1 Checkout desde Carrito (`POST /api/pedidos/checkout`)](#61-checkout-desde-carrito-post-apipedidoscheckout)
   - [6.2 Mis Pedidos (`GET /api/mis-pedidos`)](#62-mis-pedidos-get-apimis-pedidos)
   - [6.3 Detalle de Pedido Propio (`GET /api/mis-pedidos/:id`)](#63-detalle-de-pedido-propio-get-apimis-pedidosid)
   - [6.4 Cancelar o Editar Pedido Propio (`PATCH /api/pedidos/:id`)](#64-cancelar-o-editar-pedido-propio-patch-apipedidosid)
7. [Pagos y Comprobantes QR](#7-pagos-y-comprobantes-qr)
   - [7.1 Crear Transacción de Pago (`POST /api/pagos`)](#71-crear-transacción-de-pago-post-apipagos)
   - [7.2 Subir Comprobante QR (`POST /api/pagos/:id/upload-comprobante`)](#72-subir-comprobante-qr-post-apipagosidupload-comprobante)
   - [7.3 Seguimiento de Entrega / Guía (`GET /api/entregas/:id`)](#73-seguimiento-de-entrega--guía-get-apientregasid)
8. [Familia WhatsApp Especializada (`/api/integrations/whatsapp/*`)](#8-familia-whatsapp-especializada-apiintegrationswhatsapp)
   - [8.1 Crear Pedido WhatsApp (`POST /api/integrations/whatsapp/orders`)](#81-crear-pedido-whatsapp-post-apiintegrationswhatsapporders)
   - [8.2 Subir Comprobante WhatsApp (`POST /api/integrations/whatsapp/payments/:id/proof`)](#82-subir-comprobante-whatsapp-post-apiintegrationswhatsapppaymentsidproof)
   - [8.3 Consultar Estado por Celular (`GET /api/integrations/whatsapp/orders/:numeroPedido`)](#83-consultar-estado-por-celular-get-apiintegrationswhatsappordersnumeropedido)
9. [Módulo POS y Escáner (App Móvil / Personal de Tienda)](#9-módulo-pos-y-escáner-app-móvil--personal-de-tienda)
   - [9.1 Escanear Código de Barras / QR (`GET /api/pos/scan/:code`)](#91-escanear-código-de-barras--qr-get-apiposscancode)
   - [9.2 Registrar Venta Directa en Mostrador (`POST /api/pos/sales`)](#92-registrar-venta-directa-en-mostrador-post-apipossales)
   - [9.3 Sesión de Caja Activa (`GET /api/pos/caja/activa`)](#93-sesión-de-caja-activa-get-apiposcajaactiva)
   - [9.4 Apertura de Caja (`POST /api/pos/caja/apertura`)](#94-apertura-de-caja-post-apiposcajaapertura)
   - [9.5 Cierre y Arqueo de Caja (`POST /api/pos/caja/cierre`)](#95-cierre-y-arqueo-de-caja-post-apiposcajacierre)

---

## 1. Arquitectura de Integración y Base URLs

| Entorno | Base URL de la API |
|---|---|
| **Local / Desarrollo** | `http://localhost:3000/api` |
| **Producción en la Nube** | `https://control-ventas-azure.vercel.app/api` |

### Qué permite este Sistema Central a los Agentes Externos
1. **Ver Catálogo y Stock en Tiempo Real:** Variantes por color, talla, medidas, fotos y unidades disponibles para venta (`stock - stockReservado`).
2. **Conocer Logística Oficial:** Días, horas y puntos de encuentro habilitados en La Paz, o agencias de transporte nacional por departamento.
3. **Autenticar Usuarios:** Clientes pueden registrarse o iniciar sesión obteniendo un JWT Bearer de 24 horas.
4. **Gestionar Carritos Persistentes:** Permite guardar productos en el servidor para que el cliente no pierda su carrito entre dispositivos.
5. **Realizar Checkout con Bloqueo de Stock:** Reserva inventario temporalmente evitando sobreventas (30 min web, 48 hrs WhatsApp).
6. **Subir Comprobantes QR:** Envío de imágenes directamente a Cloudinary y generación de alertas inmediatas con enlace de verificación a Telegram.
7. **Canal Dedicado de WhatsApp:** API especializada con validación de teléfono, idempotencia y cálculo de vencimiento en zona horaria de Bolivia (`America/La_Paz`).
8. **Operar POS Móvil:** Vendedores pueden escanear prendas con la cámara, cobrar en efectivo o QR y cerrar turnos de caja con arqueo.

---

## 2. Autenticación, Cabeceras y Rate Limiting

### 2.1 Cabeceras Requeridas por Tipo de Consumidor

#### A. Peticiones Públicas (Catálogo, Políticas, Estado, Opciones de entrega)
```http
Accept: application/json
```

#### B. App Móvil y Clientes Desacoplados (Usuario o Vendedor)
```http
Authorization: Bearer <accessToken_obtenido_en_login>
Content-Type: application/json
Accept: application/json
```

#### C. Agente Bot de WhatsApp
```http
Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>
Content-Type: application/json
Accept: application/json
```

### 2.2 Formato de Errores Estándar

#### Error de Validación Zod (HTTP 400):
```json
{
  "message": "Datos invalidos",
  "errors": [
    {
      "field": "delivery.department",
      "message": "El departamento es requerido para envío nacional"
    },
    {
      "field": "items.0.cantidad",
      "message": "La cantidad debe ser al menos 1"
    }
  ]
}
```

#### Error de Negocio / Conflicto (HTTP 400 / 404 / 409):
```json
{
  "message": "Stock insuficiente para Chompa Alpaca (Azul - M). Disponible: 0, Solicitado: 1",
  "code": "INSUFFICIENT_STOCK"
}
```

#### Límite de Peticiones Superado (HTTP 429):
```json
{
  "message": "Demasiadas solicitudes. Inténtalo más tarde."
}
```
*Cabecera retornada:* `Retry-After: 60`.

---

## 3. Endpoints Públicos (Sin Autenticación)

### 3.1 Salud del Sistema (`GET /api/estado`)
Permite comprobar si el sistema central y la base de datos MongoDB están activos y soportan transacciones.

- **Método:** `GET`
- **Ruta:** `/api/estado`
- **Auth:** Ninguna (Público)

#### Ejemplo de Petición:
```bash
curl -X GET https://control-ventas-azure.vercel.app/api/estado
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "estado": "ok",
  "timestamp": "2026-10-14T06:20:00.000Z",
  "services": {
    "mongodb": {
      "connected": true,
      "transactionsSupported": true,
      "readOnly": false
    }
  }
}
```

---

### 3.2 Catálogo Público (`GET /api/productos/publicos`)
Consulta prendas activas disponibles para el público. Filtra datos sensibles (oculta costos y códigos de barras internos).

- **Método:** `GET`
- **Ruta:** `/api/productos/publicos`
- **Auth:** Ninguna (Público)
- **Rate Limit:** 100 req/min por IP.

#### Parámetros de Consulta (Query Params):
| Parámetro | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `q` | `string` | Búsqueda por texto (nombre, modelo, color, SKU) | `?q=alpaca` |
| `categoria` | `string` | Filtrar por categoría | `?categoria=Chompas` |
| `color` | `string` | Filtrar por color específico | `?color=Negro` |
| `talla` | `string` | Filtrar por talla (`S`, `M`, `L`, `XL`, etc.) | `?talla=M` |
| `soloDisponible`| `boolean`| Si es `true`, devuelve solo variantes con stock vendible | `?soloDisponible=true` |
| `page` | `number` | Número de página (activa respuesta paginada) | `?page=1` |
| `limit` | `number` | Cantidad de ítems por página (default 20, max 100) | `?limit=10` |

#### Ejemplo de Petición:
```bash
curl -X GET "https://control-ventas-azure.vercel.app/api/productos/publicos?q=chompa&soloDisponible=true&page=1&limit=5"
```

#### Respuesta Exitosa (HTTP 200 con paginación):
```json
{
  "data": [
    {
      "_id": "670e10a2f1b4c90012345678",
      "nombre": "Chompa Alpaca Andina",
      "modelo": "Invierno 2026",
      "categoria": "Chompas",
      "descripcion": "Chompa de lana térmica de alta montaña con diseño andino.",
      "marca": "Fit Andes",
      "sku": "CH-ALP-001",
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
          "descripcion": "Cuello alto con acabado gris",
          "imagenes": [
            "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa_negra_1.jpg",
            "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa_negra_2.jpg"
          ],
          "medidas": {
            "anchoPecho": 52,
            "anchoHombros": 44,
            "largoTotal": 68,
            "largoMangaAxila": 49,
            "largoMangaHombro": 62
          }
        },
        {
          "varianteId": "var-alp-neg-l",
          "color": "Negro",
          "colorSecundario": "Gris",
          "talla": "L",
          "stock": 6,
          "stockReservado": 0,
          "stockDisponible": 6,
          "imagenes": [
            "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa_negra_1.jpg"
          ]
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5,
  "totalPages": 1
}
```

---

### 3.3 Detalle de Producto (`GET /api/productos/publicos/:id`)
Devuelve la ficha técnica completa de una prenda.

- **Método:** `GET`
- **Ruta:** `/api/productos/publicos/:id` (donde `:id` es el ObjectId del producto)
- **Auth:** Ninguna (Público)

#### Ejemplo de Petición:
```bash
curl -X GET https://control-ventas-azure.vercel.app/api/productos/publicos/670e10a2f1b4c90012345678
```

#### Respuesta Exitosa (HTTP 200):
Retorna el objeto individual de producto idéntico a la estructura mostrada en el catálogo.

---

### 3.4 Opciones de Entrega (`GET /api/delivery-options`)
Retorna los puntos de entrega en La Paz (estaciones de teleférico, plazas) y las empresas de mensajería disponibles con agencias por departamento.

- **Método:** `GET`
- **Ruta:** `/api/delivery-options`
- **Auth:** Ninguna (Público)

#### Ejemplo de Petición:
```bash
curl -X GET https://control-ventas-azure.vercel.app/api/delivery-options
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "pickupPoints": [
    {
      "id": "teleferico-central",
      "name": "Estación Teleférico Central (Línea Roja)"
    },
    {
      "id": "plaza-estudiante",
      "name": "Plaza del Estudiante (El Prado)"
    }
  ],
  "pickupSchedules": [
    {
      "id": "mar-jue-15-18",
      "day": "Martes y Jueves",
      "start": "15:00",
      "end": "18:00",
      "label": "Martes y Jueves: 15:00 a 18:00"
    },
    {
      "id": "sab-10-14",
      "day": "Sábados",
      "start": "10:00",
      "end": "14:00",
      "label": "Sábados: 10:00 a 14:00"
    }
  ],
  "shippingCompanies": [
    {
      "id": "bolivar-cargo",
      "name": "Bolivar Cargo",
      "departments": [
        {
          "name": "Cochabamba",
          "branches": [
            "Terminal Central Cochabamba",
            "Av. Blanco Galindo Km 4"
          ]
        },
        {
          "name": "Santa Cruz",
          "branches": [
            "Terminal Bimodal Santa Cruz",
            "Sucursal Plan 3000"
          ]
        }
      ]
    }
  ]
}
```

---

### 3.5 Políticas Legales (`GET /api/public/politicas`)
Proporciona las condiciones de cambio, devolución, privacidad y términos de servicio editables por administración.

- **Método:** `GET`
- **Ruta:** `/api/public/politicas`
- **Auth:** Ninguna (Público)

#### Ejemplo de Petición:
```bash
curl -X GET https://control-ventas-azure.vercel.app/api/public/politicas
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "devoluciones": {
    "titulo": "Políticas de Devolución y Cambios",
    "contenido": "Plazo máximo de 7 días presentando prenda sin uso y comprobante...",
    "diasLimiteDevolucion": 7,
    "version": "1.0",
    "activo": true
  },
  "privacidad": {
    "titulo": "Política de Privacidad",
    "contenido": "Datos recopilados exclusivamente para despachos...",
    "version": "1.0",
    "activo": true
  },
  "terminos": {
    "titulo": "Términos y Condiciones",
    "contenido": "Todos los precios están expresados en Bolivianos (Bs)...",
    "version": "1.0",
    "activo": true
  }
}
```

---

## 4. Autenticación y Gestión de Clientes

### 4.1 Registro de Cliente (`POST /api/auth/signup`)
Registra una cuenta de cliente con rol `CLIENTE`.

- **Método:** `POST`
- **Ruta:** `/api/auth/signup`
- **Auth:** Ninguna (Público)
- **Rate Limit:** 5 req/min por IP.

#### Payload:
```json
{
  "nombreCompleto": "Carlos Mendoza",
  "email": "carlos.mendoza@gmail.com",
  "password": "PasswordSeguro123!"
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": "670e23a1f1b4c90098765432",
    "nombreCompleto": "Carlos Mendoza",
    "email": "carlos.mendoza@gmail.com",
    "rol": "CLIENTE"
  }
}
```

---

### 4.2 Login JWT (`POST /api/auth/login`)
Autentica con email y contraseña, retornando el token Bearer para uso en la app móvil o web.

- **Método:** `POST`
- **Ruta:** `/api/auth/login`
- **Auth:** Ninguna
- **Rate Limit:** 5 req/min por IP.

#### Payload:
```json
{
  "email": "carlos.mendoza@gmail.com",
  "password": "PasswordSeguro123!"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MGUyM2ExZjFiNGM5MDA5ODc2NTQzMiIsImVtYWlsIjoiY2FybG9zLm1lbmRvemFAZ21haWwuY29tIiwibm9tYnJlQ29tcGxldG8iOiJDYXJsb3MgTWVuZG96YSIsInJvbCI6IkNMSUVOVEUiLCJpYXQiOjE3Mjg4NjQwMDAsImV4cCI6MTcyODk1MDQwMH0.XXXXX",
  "user": {
    "id": "670e23a1f1b4c90098765432",
    "email": "carlos.mendoza@gmail.com",
    "nombreCompleto": "Carlos Mendoza",
    "rol": "CLIENTE"
  }
}
```

---

### 4.3 Login Google (`POST /api/auth/google`)
Autentica mediante token id de Google OAuth. Si el usuario no existe, se crea con rol `CLIENTE`.

- **Método:** `POST`
- **Ruta:** `/api/auth/google`
- **Payload:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```
- **Respuesta:** Mismo formato que `/api/auth/login`.

---

### 4.4 Perfil Propio (`GET /api/clientes/me`)
Retorna el perfil del cliente autenticado y su dirección de entrega predeterminada.

- **Método:** `GET`
- **Ruta:** `/api/clientes/me`
- **Auth:** `Authorization: Bearer <accessToken>` (Rol `CLIENTE`)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "user": {
    "_id": "670e23a1f1b4c90098765432",
    "nombreCompleto": "Carlos Mendoza",
    "email": "carlos.mendoza@gmail.com",
    "rol": "CLIENTE"
  },
  "profile": {
    "_id": "670e23b5f1b4c90098765433",
    "telefono": "59178965412",
    "tipoDocumento": "CI",
    "numeroDocumento": "6543210 LP"
  },
  "defaultAddress": {
    "_id": "670e23d0f1b4c90098765434",
    "nombreDestinatario": "Carlos Mendoza",
    "telefono": "59178965412",
    "direccion": "Av. Saavedra esq. Villalobos, Edif. Miraflores Piso 4",
    "ciudad": "La Paz",
    "departamento": "La Paz",
    "esPredeterminada": true
  }
}
```

---

### 4.5 Direcciones Guardadas (`GET /api/clientes/me/direcciones`)
- **`GET /api/clientes/me/direcciones`**: Lista todas las direcciones del cliente.
- **`POST /api/clientes/me/direcciones`**: Crea una nueva dirección.
  ```json
  {
    "alias": "Oficina",
    "nombreDestinatario": "Carlos Mendoza",
    "telefono": "78965412",
    "direccion": "Edificio Alianza Piso 2, Calacoto Calle 15",
    "ciudad": "La Paz",
    "departamento": "La Paz",
    "referencia": "Al lado de la farmacia",
    "esPredeterminada": false
  }
  ```
- **`DELETE /api/clientes/me/direcciones/:direccionId`**: Elimina una dirección guardada.

---

## 5. Carrito de Compras Persistente

Permite a la aplicación móvil o web mantener el carrito sincronizado en base de datos. Requiere `Authorization: Bearer <accessToken>` (Rol `CLIENTE`).

### 5.1 Obtener Carrito (`GET /api/carrito`)
Devuelve los ítems agregados calculando el subtotal y validando disponibilidad de stock.

```bash
curl -X GET https://control-ventas-azure.vercel.app/api/carrito \
  -H "Authorization: Bearer <accessToken>"
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e24aaf1b4c90098765440",
  "cliente": "670e23a1f1b4c90098765432",
  "items": [
    {
      "_id": "item-670e24aaf1b4",
      "productoId": "670e10a2f1b4c90012345678",
      "variante": {
        "varianteId": "var-alp-neg-m",
        "color": "Negro",
        "colorSecundario": "Gris",
        "talla": "M"
      },
      "productoSnapshot": {
        "nombre": "Chompa Alpaca Andina",
        "sku": "CH-ALP-001",
        "imagen": "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa_negra_1.jpg"
      },
      "precioUnitario": 135.00,
      "cantidad": 2,
      "subtotal": 270.00
    }
  ],
  "totalArticulos": 2,
  "subtotal": 270.00
}
```

---

### 5.2 Agregar Ítem (`POST /api/carrito/items`)
Agrega una prenda con su variante específica. Valida que `stock - stockReservado >= cantidad`.

#### Payload:
```json
{
  "productoId": "670e10a2f1b4c90012345678",
  "varianteId": "var-alp-neg-m",
  "color": "Negro",
  "colorSecundario": "Gris",
  "talla": "M",
  "cantidad": 1
}
```

#### Respuesta Exitosa (HTTP 200):
Retorna el documento del carrito recalculado.

#### Error si no hay stock (HTTP 400):
```json
{
  "message": "Stock insuficiente para agregar al carrito"
}
```

---

### 5.3 Modificar Cantidad (`PATCH /api/carrito/items/:itemId`)
```json
{
  "cantidad": 3
}
```

### 5.4 Eliminar Ítem (`DELETE /api/carrito/items/:itemId`)
Remueve el ítem y recalcula el total del carrito.

### 5.5 Vaciar Carrito (`DELETE /api/carrito`)
Elimina todos los ítems del carrito del cliente.

---

## 6. Checkout y Pedidos Web / Móvil

### 6.1 Checkout desde Carrito (`POST /api/pedidos/checkout`)
El endpoint maestro de compra para clientes web o de la app móvil.  
**Efectos atómicos:**
1. Valida el carrito y comprueba stock en tiempo real.
2. Bloquea el stock en modo `RESERVED` (`stockReservado = stockReservado + cantidad`).
3. Vacía el carrito del usuario.
4. Crea el documento `Pedido` con estado `PENDING_PAYMENT`.
5. Si `metodoPago` es `QR`, genera el vencimiento de reserva (30 min) y crea `TransaccionPago` en `PENDING`.

- **Método:** `POST`
- **Ruta:** `/api/pedidos/checkout`
- **Auth:** `Authorization: Bearer <accessToken>` (Rol `CLIENTE`)

#### Payload Ejemplo A: Entrega en Punto de Recojo en La Paz:
```json
{
  "metodoPago": "QR",
  "entrega": {
    "metodo": "PICKUP_POINT",
    "direccion": "Estación Teleférico Central (Línea Roja)",
    "telefono": "59178965412",
    "nombreDestinatario": "Carlos Mendoza",
    "programadoPara": "2026-10-18T16:00:00-04:00"
  }
}
```

#### Payload Ejemplo B: Envío Nacional a Agencia de Courier:
```json
{
  "metodoPago": "QR",
  "entrega": {
    "metodo": "SHIPPING_NATIONAL",
    "departamento": "Cochabamba",
    "ciudad": "Cochabamba",
    "empresaEnvio": "Bolivar Cargo",
    "sucursal": "Terminal Central Cochabamba",
    "nombreDestinatario": "Carlos Mendoza",
    "ciRemitente": "6543210 LP",
    "telefonoRemitente": "59178965412"
  }
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "message": "Pedido creado exitosamente desde el carrito",
  "pedido": {
    "_id": "670e3001f1b4c90011223344",
    "numeroPedido": "P-261014-089",
    "canal": "WEB",
    "estadoPedido": "PENDING_PAYMENT",
    "estadoPago": "PENDING",
    "estadoEntrega": "PENDING",
    "estadoReservaStock": "RESERVED",
    "reservaExpiraEn": "2026-10-14T06:50:00.000Z",
    "metodoPago": "QR",
    "subtotal": 270.00,
    "costoEnvio": 0.00,
    "descuento": 0.00,
    "total": 270.00,
    "items": [
      {
        "productoId": "670e10a2f1b4c90012345678",
        "variante": {
          "color": "Negro",
          "talla": "M"
        },
        "productoSnapshot": {
          "nombre": "Chompa Alpaca Andina",
          "sku": "CH-ALP-001"
        },
        "cantidad": 2,
        "precioUnitario": 135.00,
        "totalLinea": 270.00
      }
    ],
    "snapshotEntrega": {
      "metodo": "PICKUP_POINT",
      "puntoRecojo": "Estación Teleférico Central (Línea Roja)",
      "telefono": "59178965412",
      "nombreDestinatario": "Carlos Mendoza"
    }
  }
}
```

---

### 6.2 Mis Pedidos (`GET /api/mis-pedidos`)
Lista el historial de compras del cliente autenticado.

- **Método:** `GET`
- **Ruta:** `/api/mis-pedidos`
- **Auth:** `Authorization: Bearer <accessToken>` (Rol `CLIENTE`)

#### Respuesta Exitosa (HTTP 200):
```json
[
  {
    "_id": "670e3001f1b4c90011223344",
    "numeroPedido": "P-261014-089",
    "canal": "WEB",
    "estadoPedido": "CONFIRMED",
    "estadoPago": "PAID",
    "estadoEntrega": "READY",
    "total": 270.00,
    "createdAt": "2026-10-14T06:20:00.000Z",
    "items": [ ... ]
  }
]
```

---

### 6.3 Detalle de Pedido Propio (`GET /api/mis-pedidos/:id`)
Obtiene la orden individual si pertenece al usuario solicitante. Status `403` si pertenece a otro usuario.

---

### 6.4 Cancelar o Editar Pedido Propio (`PATCH /api/pedidos/:id`)
Un cliente puede cancelar su pedido si aún se encuentra en `PENDING_PAYMENT`, liberando el stock inmediatamente.

#### Payload para Cancelar:
```json
{
  "estadoPedido": "CANCELLED"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e3001f1b4c90011223344",
  "numeroPedido": "P-261014-089",
  "estadoPedido": "CANCELLED",
  "estadoPago": "FAILED",
  "estadoReservaStock": "RELEASED"
}
```

---

## 7. Pagos y Comprobantes QR

### 7.1 Crear Transacción de Pago (`POST /api/pagos`)
Si el cliente no usó checkout automático o la app móvil necesita generar una transacción manual con clave de idempotencia:

- **Método:** `POST`
- **Ruta:** `/api/pagos`
- **Payload:**
```json
{
  "pedidoId": "670e3001f1b4c90011223344",
  "metodoPago": "QR",
  "idempotencyKey": "app-pago-670e3001f1b4-v1",
  "referenciaExterna": "cliente-bancosol-ref-89"
}
```

---

### 7.2 Subir Comprobante QR (`POST /api/pagos/:id/upload-comprobante`)
Permite subir la foto de la transferencia o pago QR realizado por el cliente.  
**Efectos en el Backend Central:**
1. Sube la imagen a Cloudinary en la carpeta `control-ventas/comprobantes`.
2. Asocia la URL en `TransaccionPago.urlComprobante`.
3. Genera un token criptográfico de un solo uso (SHA-256) con vencimiento de 48 horas.
4. Envía un mensaje con foto y botones interactivos al canal de Telegram de los administradores.
5. Extiende la reserva del pedido por 48 horas mientras el administrador verifica el ingreso en su cuenta bancaria.

- **Método:** `POST`
- **Ruta:** `/api/pagos/:id/upload-comprobante` (donde `:id` es el ID de la `TransaccionPago`)
- **Content-Type:** `multipart/form-data`
- **Campo:** `file` (archivo de imagen JPG/PNG, máximo 5 MB)

#### Ejemplo con cURL:
```bash
curl -X POST https://control-ventas-azure.vercel.app/api/pagos/670e3002f1b4c90011223345/upload-comprobante \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@/ruta/al/comprobante_bancosol.jpg"
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Comprobante subido correctamente. El administrador fue notificado.",
  "urlComprobante": "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864500/control-ventas/comprobantes/comp_x9123.jpg"
}
```

---

### 7.3 Seguimiento de Entrega / Guía (`GET /api/entregas/:id`)
Permite al cliente o vendedor consultar el estado logístico de un pedido (código de guía del transportista nacional, repartidor asignado y marcas de tiempo).

- **Método:** `GET`
- **Ruta:** `/api/entregas/:id` (donde `:id` es el ID del `Pedido`)
- **Auth:** `Authorization: Bearer <accessToken>`

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e3005f1b4c90011223399",
  "pedidoId": "670e3001f1b4c90011223344",
  "numeroPedido": "P-261014-089",
  "canal": "WEB",
  "metodo": "SHIPPING_NATIONAL",
  "estado": "IN_TRANSIT",
  "codigoSeguimiento": "GUIA-BOLIVAR-77889",
  "nombreTransportista": "Bolivar Cargo",
  "telefono": "59178965412",
  "nombreDestinatario": "Carlos Mendoza",
  "preparadoEn": "2026-10-14T08:00:00.000Z",
  "enTransitoEn": "2026-10-14T10:30:00.000Z",
  "entregadoEn": null
}
```

---

## 8. Familia WhatsApp Especializada (`/api/integrations/whatsapp/*`)

Familia de endpoints diseñada exclusivamente para el **Bot / Agente Conversacional de WhatsApp**.  
**Seguridad:** Todas las llamadas exigen la cabecera:
```http
Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>
```

### 8.1 Crear Pedido WhatsApp (`POST /api/integrations/whatsapp/orders`)
Crea un pedido omnicanal con canal `"WHATSAPP"`.  
**Reglas Especiales:**
- Requiere `idempotencyKey` única por mensaje/conversación para evitar pedidos dobles.
- Si el cliente existe por su teléfono (`perfilCliente.telefono`), el pedido se asocia automáticamente a su usuario.
- Reserva stock y calcula el vencimiento exactamente al **final del día programado** (`23:59:59.999` hora de La Paz, UTC-4).
- Si es Envío Nacional, el costo de envío es automáticamente **Bs 10.00**. Si es recojo, es **Bs 0.00**.
- Retorna las instrucciones completas de pago con QR de BancoSol para reenviar al usuario de WhatsApp.

#### Payload Ejemplo (Recojo en Punto):
```json
{
  "idempotencyKey": "wa-msg-9988776655",
  "customer": {
    "phone": "59167113105",
    "name": "Ana Rodríguez"
  },
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "cantidad": 1
    }
  ],
  "paymentMethod": "QR",
  "delivery": {
    "method": "PICKUP_POINT",
    "scheduledFor": "2026-10-18T16:00:00-04:00",
    "pickupPointId": "teleferico-central",
    "pickupScheduleId": "sab-10-14",
    "recipientName": "Ana Rodríguez",
    "phone": "59167113105"
  },
  "notes": "Cliente consultó por talla antes de ordenar"
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "numeroPedido": "P-261014-095",
  "pedidoId": "670e3500f1b4c90011556677",
  "pagoId": "670e3500f1b4c90011556678",
  "subtotal": 135.00,
  "costoEnvio": 0.00,
  "descuento": 0.00,
  "total": 135.00,
  "estado": "PENDING_PAYMENT",
  "vencimientoReserva": "2026-10-19T03:59:59.999Z",
  "paymentInstructions": {
    "method": "QR",
    "bank": "BancoSol",
    "accountHolder": "Fernando Leon Andrade Gutierrez",
    "qrImageUrl": "https://res.cloudinary.com/dq1jeikev/image/upload/v1777964054/comprobante_xvdhuf.jpg",
    "amount": 135.00,
    "message": "Realiza el pago por QR y envía aquí la captura de tu comprobante."
  },
  "notification": {
    "to": "59167113105",
    "type": "NEW_ORDER",
    "text": "📦 *NUEVO PEDIDO DESDE WHATSAPP*\n\n*Pedido:* #P-261014-095\n*Cliente:* Ana Rodríguez (59167113105)\n*Total a Pagar:* Bs 135.00..."
  }
}
```

---

### 8.2 Subir Comprobante WhatsApp (`POST /api/integrations/whatsapp/payments/:id/proof`)
Cuando el usuario envía una imagen de su transferencia bancaria por WhatsApp, el bot reenvía el archivo binario a este endpoint.

- **Método:** `POST`
- **Ruta:** `/api/integrations/whatsapp/payments/:paymentId/proof`
- **Content-Type:** `multipart/form-data`
- **Campo:** `file` (JPG/PNG max 5 MB)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Comprobante registrado exitosamente. El administrador fue notificado para su verificación.",
  "paymentId": "670e3500f1b4c90011556678",
  "urlComprobante": "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864700/control-ventas/comprobantes/wa_comp_8877.jpg",
  "tokenRevision": "8f31b4e5-9012-4c56-8a90-abcdef123456",
  "verifyUrl": "https://control-ventas-azure.vercel.app/verificar/pago/8f31b4e5-9012-4c56-8a90-abcdef123456",
  "notification": {
    "to": "59167113105",
    "type": "PAYMENT_PROOF_UPLOADED",
    "text": "🧾 *NUEVO COMPROBANTE RECIBIDO DESDE WHATSAPP*..."
  }
}
```

---

### 8.3 Consultar Estado por Celular (`GET /api/integrations/whatsapp/orders/:numeroPedido`)
Permite al bot responder cuando un usuario pregunta *"¿Cómo va mi pedido P-261014-095?"*.  
Por privacidad, exige el parámetro `phone` que debe coincidir con el teléfono del cliente o destinatario.

- **Método:** `GET`
- **Ruta:** `/api/integrations/whatsapp/orders/P-261014-095?phone=59167113105`

#### Respuesta Exitosa (HTTP 200):
```json
{
  "numeroPedido": "P-261014-095",
  "createdAt": "2026-10-14T06:30:00.000Z",
  "estadoPedido": "CONFIRMED",
  "estadoPago": "PAID",
  "estadoEntrega": "READY",
  "estadoReservaStock": "CONSUMED",
  "vencimientoReserva": "2026-10-19T03:59:59.999Z",
  "subtotal": 135.00,
  "costoEnvio": 0.00,
  "total": 135.00,
  "items": [
    {
      "nombre": "Chompa Alpaca Andina",
      "color": "Negro",
      "talla": "M",
      "cantidad": 1,
      "precioUnitario": 135.00,
      "totalLinea": 135.00
    }
  ],
  "entrega": {
    "metodo": "PICKUP_POINT",
    "nombreDestinatario": "Ana Rodríguez",
    "telefono": "59167113105",
    "puntoRecojo": "Estación Teleférico Central (Línea Roja)",
    "programadoPara": "2026-10-18T16:00:00-04:00"
  }
}
```

---

## 9. Módulo POS y Escáner (App Móvil / Personal de Tienda)

Diseñado para la aplicación móvil que utilizan los dependientes en tiendas físicas (`ADMIN` y `VENDEDOR`).

### 9.1 Escanear Código de Barras / QR (`GET /api/pos/scan/:code`)
Al apuntar la cámara a la etiqueta de la prenda, busca instantáneamente el producto y variante correspondiente. Si se pasa `sucursalId`, devuelve el stock físico disponible en ese local específico.

- **Método:** `GET`
- **Ruta:** `/api/pos/scan/:code?sucursalId=670e1000f1b4c90011000001`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "productoId": "670e10a2f1b4c90012345678",
  "nombre": "Chompa Alpaca Andina",
  "modelo": "Invierno 2026",
  "sku": "CH-ALP-001",
  "precioVenta": 135.00,
  "stockTotalGlobal": 14,
  "stockSucursal": 4,
  "scanSource": "BARCODE",
  "variante": {
    "varianteId": "var-alp-neg-m",
    "color": "Negro",
    "talla": "M",
    "codigoBarra": "7771234567890",
    "qrCode": "QR-CH-ALP-NEG-M",
    "stock": 8,
    "stockDisponible": 7
  }
}
```

---

### 9.2 Registrar Venta Directa en Mostrador (`POST /api/pos/sales`)
Completa una venta inmediata en mostrador.  
**Efecto Inmediato:**
- Crea el `Pedido` en canal `"TIENDA"` con estado `DELIVERED`, pago `PAID` y stock `CONSUMED`.
- Descuenta físicamente el stock de la sucursal (`NivelStock`) y del catálogo global.
- Registra el asiento de Kárdex (`SALIDA`).
- Registra el ingreso en la cuenta de dinero de la tienda y lo suma a la `SesionCaja` activa.

- **Método:** `POST`
- **Ruta:** `/api/pos/sales`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Payload:
```json
{
  "sucursalId": "670e1000f1b4c90011000001",
  "metodoPago": "EFECTIVO", // o "QR"
  "descuento": 10.00,
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "cantidad": 1,
      "precioUnitario": 135.00
    }
  ]
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "_id": "670e4000f1b4c90011778899",
  "numeroPedido": "P-261014-102",
  "canal": "TIENDA",
  "estadoPedido": "DELIVERED",
  "estadoPago": "PAID",
  "estadoEntrega": "NOT_APPLICABLE",
  "estadoReservaStock": "CONSUMED",
  "metodoPago": "EFECTIVO",
  "subtotal": 135.00,
  "descuento": 10.00,
  "total": 125.00,
  "gananciaTotal": 55.00
}
```

---

### 9.3 Sesión de Caja Activa (`GET /api/pos/caja/activa`)
Verifica si el vendedor tiene un turno de caja abierto en su sucursal antes de poder realizar cobros.

- **Método:** `GET`
- **Ruta:** `/api/pos/caja/activa?sucursalId=670e1000f1b4c90011000001`

#### Respuesta (Si hay caja abierta):
```json
{
  "activa": true,
  "sesion": {
    "_id": "670e4100f1b4c90011889900",
    "sucursalId": "670e1000f1b4c90011000001",
    "fechaApertura": "2026-10-14T08:00:00.000Z",
    "montoApertura": 100.00,
    "totalVentasEfectivo": 125.00,
    "totalVentasQR": 270.00,
    "totalIngresosManuales": 0.00,
    "totalEgresosManuales": 15.00,
    "montoEsperadoEfectivo": 210.00,
    "estado": "ABIERTA"
  }
}
```
*Si no hay caja abierta:* Retorna `{ "activa": false, "sesion": null }`. La app debe mostrar la pantalla de apertura.

---

### 9.4 Apertura de Caja (`POST /api/pos/caja/apertura`)
Inicia el turno de venta con el monto de cambio inicial.

```json
{
  "sucursalId": "670e1000f1b4c90011000001",
  "montoApertura": 100.00,
  "notasApertura": "Caja abierta con cambio de 100 Bs en monedas y billetes chicos"
}
```

---

### 9.5 Cierre y Arqueo de Caja (`POST /api/pos/caja/cierre`)
Finaliza el turno. El vendedor cuenta los billetes físicos y envía `montoDeclaradoEfectivo`. El backend calcula automáticamente el descuadre (`diferenciaEfectivo = montoDeclaradoEfectivo - montoEsperadoEfectivo`).

```json
{
  "sucursalId": "670e1000f1b4c90011000001",
  "montoDeclaradoEfectivo": 210.00,
  "notasCierre": "Cuadre exacto al cierre de turno tarde"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Sesión de caja cerrada exitosamente",
  "resumen": {
    "_id": "670e4100f1b4c90011889900",
    "montoApertura": 100.00,
    "montoEsperadoEfectivo": 210.00,
    "montoDeclaradoEfectivo": 210.00,
    "diferenciaEfectivo": 0.00,
    "estado": "CERRADA"
  }
}
```
