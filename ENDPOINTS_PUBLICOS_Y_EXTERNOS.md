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
   - [4.5 Direcciones Guardadas (`GET/POST/PUT/DELETE /api/clientes/me/direcciones`)](#45-direcciones-guardadas-getpostputdelete-apiclientesmedirecciones)
5. [Carrito de Compras Persistente](#5-carrito-de-compras-persistente)
   - [5.1 Obtener Carrito (`GET /api/carrito`)](#51-obtener-carrito-get-apicarrito)
   - [5.2 Agregar Ítem (`POST /api/carrito/items`)](#52-agregar-ítem-post-apicarritoitems)
   - [5.3 Modificar Cantidad (`PUT/PATCH /api/carrito/items/:itemId`)](#53-modificar-cantidad-putpatch-apicarritoitemsitemid)
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
   - [8.4 Búsqueda Rápida y Compacta para IA (`GET /api/integrations/whatsapp/products/search`)](#84-búsqueda-rápida-y-compacta-para-ia-get-apiintegrationswhatsappproductssearch)
   - [8.5 Medidas y Asesoría de Tallas (`GET /api/integrations/whatsapp/products/:id/measurements`)](#85-medidas-y-asesoría-de-tallas-get-apiintegrationswhatsappproductsidmeasurements)
9. [Módulo POS y Escáner (App Móvil / Personal de Tienda)](#9-módulo-pos-y-escáner-app-móvil--personal-de-tienda)
   - [9.1 Escanear Código de Barras / QR (`GET /api/pos/scan/:code`)](#91-escanear-código-de-barras--qr-get-apiposscancode)
   - [9.2 Registrar Venta Directa en Mostrador (`POST /api/pos/sales`)](#92-registrar-venta-directa-en-mostrador-post-apipossales)
   - [9.3 Sesión de Caja Activa y Modo Libre (`GET /api/pos/caja/activa`)](#93-sesión-de-caja-activa-y-modo-libre-get-apiposcajaactiva)
   - [9.4 Apertura de Caja (`POST /api/pos/caja/apertura`)](#94-apertura-de-caja-post-apiposcajaapertura)
   - [9.5 Movimientos Manuales de Caja (`POST /api/pos/caja/movimiento-manual`)](#95-movimientos-manuales-de-caja-post-apiposcajamovimiento-manual)
   - [9.6 Cierre y Arqueo de Caja (`POST /api/pos/caja/cierre`)](#96-cierre-y-arqueo-de-caja-post-apiposcajacierre)
10. [Sucursales y Stock por Tienda](#10-sucursales-y-stock-por-tienda)
    - [10.1 Listado de Sucursales (`GET /api/admin/sucursales`)](#101-listado-de-sucursales-get-apiadminsucursales)
    - [10.2 Desglose de Stock por Sucursal (`GET /api/admin/productos/:id/stock-sucursales`)](#102-desglose-de-stock-por-sucursal-get-apiadminproductosidstock-sucursales)
    - [10.3 Detalle y Actualización de Sucursal (`GET/PUT/PATCH /api/admin/sucursales/:id`)](#103-detalle-y-actualización-de-sucursal-getputpatch-apiadminsucursalesid)
11. [Compras de Proveedores y Reemplazo Atómico](#11-compras-de-proveedores-y-reemplazo-atómico)
    - [11.1 Listar Compras (`GET /api/compras`)](#111-listar-compras-get-apicompras)
    - [11.2 Registrar Compra con CPP (`POST /api/compras`)](#112-registrar-compra-con-cpp-post-apicompras)
    - [11.3 Detalle de Compra y Snapshots (`GET /api/compras/:id`)](#113-detalle-de-compra-y-snapshots-get-apicomprasid)
    - [11.4 Anular Compra con Reversión (`DELETE /api/compras/:id`)](#114-anular-compra-con-reversión-delete-apicomprasid)
    - [11.5 Reemplazo Atómico / Clonación Corregida (`PUT /api/compras/:id`)](#115-reemplazo-atómico--clonación-corregida-put-apicomprasid)
    - [11.6 Actualización de Metadatos de Compra (`PATCH /api/compras/:id`)](#116-actualización-de-metadatos-de-compra-patch-apicomprasid)
12. [Traspasos de Mercadería entre Sucursales](#12-traspasos-de-mercadería-entre-sucursales)
    - [12.1 Listar Traspasos (`GET /api/admin/traspasos`)](#121-listar-traspasos-get-apiadmintraspasos)
    - [12.2 Solicitar Traspaso (`POST /api/admin/traspasos`)](#122-solicitar-traspaso-post-apiadmintraspasos)
    - [12.3 Despachar Traspaso (`POST /api/admin/traspasos/:id/despachar`)](#123-despachar-traspaso-post-apiadmintraspasosiddespachar)
    - [12.4 Recibir Traspaso (`POST /api/admin/traspasos/:id/recibir`)](#124-recibir-traspaso-post-apiadmintraspasosidrecibir)

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
8. **Operar POS Móvil y Cajas Flexibles:** Vendedores pueden escanear prendas con la cámara, cobrar en efectivo o QR, validar stock físico local y operar con turnos de caja formales o caja libre según la sucursal (`requiereAperturaCaja`).
9. **Desglose de Stock Multisucursal y Traspasos:** Visualización pormenorizada por sucursal de existencias físicas y reservadas, y control de traspasos seguros en dos fases (despacho en origen y recepción en destino).
10. **Reabastecimiento con CPP y Corrección Atómica:** Registro de compras con Costo Promedio Ponderado (CPP), anulación con reversión total de inventario/caja, y reemplazo atómico transaccional para corregir compras erradas.

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
Consulta prendas activas disponibles para la tienda web.
* **Seguridad:** Oculta estrictamente costos internos (`precioCosto`, `costoOrigen`, `variantes.precioCosto`) y códigos de barra/QR internos.
* **Inventario Web:** Las existencias (`stockTotal`, `stockReservadoTotal`, `stockDisponible` de producto y variantes) se calculan sumando únicamente las sucursales activas autorizadas para despacho web (`permiteDespachoWeb = true`). Las existencias de tiendas físicas aisladas de la web no computan aquí.
* **Precios y Rangos:** Cada variante incluye su `precioVenta` efectivo garantizado (con fallback al precio base del padre si no está diferenciado). El producto raíz incluye `precioMinimo`, `precioMaximo`, `tieneRangoPrecios` y `precioDisplay` formateado.

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
| `soloDisponible`| `boolean`| Si es `true`, devuelve solo variantes con stock vendible en sucursales web | `?soloDisponible=true` |
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
      "precioMinimo": 135.00,
      "precioMaximo": 150.00,
      "tieneRangoPrecios": true,
      "precioDisplay": "Bs 135.00 - Bs 150.00",
      "descuento": 0,
      "stockTotal": 14,
      "stockReservadoTotal": 1,
      "stockDisponible": 13,
      "estado": "ACTIVO",
      "variantes": [
        {
          "varianteId": "var-alp-neg-m",
          "color": "Negro",
          "colorSecundario": "Gris",
          "talla": "M",
          "precioVenta": 135.00,
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
          "varianteId": "var-alp-neg-xl",
          "color": "Negro",
          "colorSecundario": "Gris",
          "talla": "XL",
          "precioVenta": 150.00,
          "stock": 6,
          "stockReservado": 0,
          "stockDisponible": 6,
          "imagenes": [
            "https://res.cloudinary.com/dq1jeikev/image/upload/v1728864000/chompa_negra_1.jpg"
          ],
          "medidas": {
            "anchoPecho": 58,
            "anchoHombros": 48,
            "largoTotal": 72,
            "largoMangaAxila": 52,
            "largoMangaHombro": 65
          }
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

### 4.5 Direcciones Guardadas (`GET/POST/PUT/DELETE /api/clientes/me/direcciones`)
Permite al cliente gestionar su libreta de direcciones para despachos y envíos.

- **`GET /api/clientes/me/direcciones`**: Lista todas las direcciones guardadas del cliente.
- **`POST /api/clientes/me/direcciones`**: Crea una nueva dirección.
  ```json
  {
    "etiqueta": "Oficina",
    "nombreDestinatario": "Carlos Mendoza",
    "telefono": "78965412",
    "direccion": "Edificio Alianza Piso 2, Calacoto Calle 15",
    "ciudad": "La Paz",
    "departamento": "La Paz",
    "zona": "Calacoto",
    "referencia": "Al lado de la farmacia",
    "esPredeterminada": false
  }
  ```
- **`PUT /api/clientes/me/direcciones/:direccionId`** (o `PATCH`): Actualiza los datos de una dirección guardada existente (admite modificar `etiqueta`, `nombreDestinatario`, `telefono`, `departamento`, `ciudad`, `zona`, `direccion`, `referencia`, `codigoPostal`, `esPredeterminada`).
  ```json
  {
    "telefono": "78965499",
    "referencia": "Al lado de la farmacia, timbre piso 2",
    "esPredeterminada": true
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

### 5.3 Modificar Cantidad (`PUT /api/carrito/items/:itemId`)
Actualiza la cantidad solicitada de un ítem ya añadido al carrito. Admite tanto `PUT` como `PATCH`.

```bash
curl -X PUT https://control-ventas-azure.vercel.app/api/carrito/items/item-670e24aaf1b4 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 3}'
```

#### Payload:
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

### 8.4 Búsqueda Rápida y Compacta para IA (`GET /api/integrations/whatsapp/products/search`)
Diseñado para que el **Agente IA de WhatsApp** busque productos y variantes disponibles de forma ultrarrápida (<50ms) y con un consumo mínimo de tokens de contexto (80% más liviano que el catálogo público).

- **Método:** `GET`
- **Ruta:** `/api/integrations/whatsapp/products/search`
- **Cabeceras:** `Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>`
- **Query Params:**
  * `q` *(opcional)*: Término de búsqueda o modelo (ej. `alpaca`, `cuello V`, `chompa`).
  * `color` *(opcional)*: Color primario o secundario (ej. `azul`, `marino`, `negro`).
  * `talla` *(opcional)*: Talla exacta (ej. `S`, `M`, `L`, `XL`).
  * `minPrecio` / `maxPrecio` *(opcional)*: Rango de precio en Bs.
  * `limit` *(opcional, default 5, máx 20)*: Cantidad máxima de productos.

#### Reglas de Negocio:
1. Filtra automáticamente en MongoDB prendas con `estado: "ACTIVO"`.
2. Filtra y devuelve **únicamente variantes con stock web real disponible (`stockDisponible > 0`)**.
3. Si la variante tiene fotos en Cloudinary, transforma automáticamente la URL inyectando `f_auto,q_auto,w_800/` para que la imagen sea ultraliviana, optimizada para WhatsApp y cargue al instante en conexiones móviles.
4. Incluye un resumen anatómico de medidas (`anchoPecho` y `largoTotal`) si están registradas.

#### Ejemplo de Petición:
```bash
curl -X GET "https://control-ventas-azure.vercel.app/api/integrations/whatsapp/products/search?color=azul&talla=M" \
  -H "Authorization: Bearer fit_andes_wa_secret_..."
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "total": 1,
  "productos": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "nombre": "Chompa Cuello V",
      "modelo": "Alpaca Clásica",
      "categoria": "Chompas",
      "precioVenta": 140,
      "descripcionCorta": "Chompa tejida con lana de alpaca suave, abrigadora y liviana para clima frío.",
      "variantesDisponibles": [
        {
          "varianteId": "var-alp-az-m",
          "color": "Azul Marino",
          "colorSecundario": null,
          "talla": "M",
          "stockDisponible": 4,
          "precioVenta": 140,
          "imagen": "https://res.cloudinary.com/dq1jeikev/image/upload/f_auto,q_auto,w_800/v1728864000/chompa-azul-m.jpg",
          "medidasResumen": {
            "anchoPecho": 54,
            "largoTotal": 68
          }
        }
      ]
    }
  ]
}
```

---

### 8.5 Medidas y Asesoría de Tallas (`GET /api/integrations/whatsapp/products/:id/measurements`)
Permite al bot responder con precisión cuando el cliente pregunta por la estatura, contextura física o medidas exactas de una prenda (ej. *"Mido 1.80m y peso 75kg, ¿qué talla me recomiendan?"*).

- **Método:** `GET`
- **Ruta:** `/api/integrations/whatsapp/products/:id/measurements`
- **Cabeceras:** `Authorization: Bearer <WHATSAPP_INTEGRATION_API_KEY>`

#### Ejemplo de Petición:
```bash
curl -X GET "https://control-ventas-azure.vercel.app/api/integrations/whatsapp/products/670e10a2f1b4c90012345678/measurements" \
  -H "Authorization: Bearer fit_andes_wa_secret_..."
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "productoId": "670e10a2f1b4c90012345678",
  "nombre": "Chompa Cuello V",
  "modelo": "Alpaca Clásica",
  "categoria": "Chompas",
  "tallas": [
    {
      "talla": "M",
      "coloresDisponibles": ["Azul Marino", "Negro"],
      "medidas": {
        "anchoPecho": 54,
        "anchoHombros": 46,
        "largoTotal": 68,
        "largoMangaAxila": 50,
        "largoMangaHombro": 62
      }
    },
    {
      "talla": "L",
      "coloresDisponibles": ["Azul Marino"],
      "medidas": {
        "anchoPecho": 58,
        "anchoHombros": 49,
        "largoTotal": 72,
        "largoMangaAxila": 52,
        "largoMangaHombro": 64
      }
    }
  ]
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

### 9.3 Sesión de Caja Activa y Modo Libre (`GET /api/pos/caja/activa`)
Verifica el estado del turno de caja para la sucursal del vendedor. Permite saber si existe una sesión abierta y si esa sucursal en particular exige apertura obligatoria de caja para cobrar.

- **Método:** `GET`
- **Ruta:** `/api/pos/caja/activa?sucursalId=670e1000f1b4c90011000001`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)
- *Nota sobre `sucursalId`:* Si se omite en la query, el backend intentará resolver la sucursal asignada al perfil del usuario o, en su defecto, el almacén principal activo.

#### Respuesta cuando hay caja abierta (HTTP 200):
```json
{
  "sesion": {
    "_id": "670e4100f1b4c90011889900",
    "sucursalId": "670e1000f1b4c90011000001",
    "usuarioAperturaId": "670e0001f1b4c90011000099",
    "fechaApertura": "2026-10-14T08:00:00.000Z",
    "montoApertura": 100.00,
    "totalVentasEfectivo": 125.00,
    "totalVentasQR": 270.00,
    "totalIngresosManuales": 0.00,
    "totalEgresosManuales": 15.00,
    "montoEsperadoEfectivo": 210.00,
    "estado": "ABIERTA"
  },
  "sucursal": {
    "_id": "670e1000f1b4c90011000001",
    "nombre": "Tienda 1 - San Miguel",
    "requiereAperturaCaja": true,
    "permiteVentaPOS": true
  }
}
```

#### Respuesta cuando no hay caja abierta pero la sucursal opera en Caja Libre (HTTP 200):
```json
{
  "sesion": null,
  "sucursal": {
    "_id": "670e1000f1b4c90011000002",
    "nombre": "Almacén Central / Showroom",
    "requiereAperturaCaja": false,
    "permiteVentaPOS": true
  }
}
```

> [!IMPORTANT]
> **Regla de Negocio (Apertura de Caja Opcional vs Obligatoria):**
> 1. Si `sesion === null` y `sucursal.requiereAperturaCaja === true`: La app de POS **debe exigir** al dependiente abrir caja (`POST /api/pos/caja/apertura`) antes de cobrar ventas en mostrador.
> 2. Si `sesion === null` y `sucursal.requiereAperturaCaja === false`: La tienda física o almacén opera en modo "Turno Opcional / Caja Libre". El POS permite registrar ventas de inmediato (`POST /api/pos/sales`) sin bloquear al usuario, asociando los ingresos a la tesorería general sin necesidad de un turno formal.

---

### 9.4 Apertura de Caja (`POST /api/pos/caja/apertura`)
Inicia el turno de venta registrando el fondo inicial de cambio en efectivo.

- **Método:** `POST`
- **Ruta:** `/api/pos/caja/apertura`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Payload:
```json
{
  "sucursalId": "670e1000f1b4c90011000001",
  "montoApertura": 100.00,
  "notasApertura": "Caja abierta con cambio de 100 Bs en monedas y billetes chicos"
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "_id": "670e4100f1b4c90011889900",
  "sucursalId": "670e1000f1b4c90011000001",
  "usuarioAperturaId": "670e0001f1b4c90011000099",
  "fechaApertura": "2026-10-14T08:00:00.000Z",
  "montoApertura": 100.00,
  "totalVentasEfectivo": 0.00,
  "totalVentasQR": 0.00,
  "totalIngresosManuales": 0.00,
  "totalEgresosManuales": 0.00,
  "montoEsperadoEfectivo": 100.00,
  "estado": "ABIERTA"
}
```

---

### 9.5 Movimientos Manuales de Caja (`POST /api/pos/caja/movimiento-manual`)
Registra ingresos o egresos de dinero no comerciales ocurridos durante el turno (por ejemplo: retiro para almuerzo del personal, compra de suministros de limpieza o inyección adicional de cambio).

- **Método:** `POST`
- **Ruta:** `/api/pos/caja/movimiento-manual`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Payload:
```json
{
  "sesionId": "670e4100f1b4c90011889900",
  "tipo": "EGRESO_MANUAL", // Valores: "INGRESO_MANUAL" | "EGRESO_MANUAL"
  "monto": 25.00,
  "motivo": "Compra urgente de cinta de embalaje y bolsas para la tienda"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e4100f1b4c90011889900",
  "sucursalId": "670e1000f1b4c90011000001",
  "totalEgresosManuales": 25.00,
  "montoEsperadoEfectivo": 75.00,
  "movimientosManuales": [
    {
      "tipo": "EGRESO_MANUAL",
      "monto": 25.00,
      "motivo": "Compra urgente de cinta de embalaje y bolsas para la tienda",
      "fecha": "2026-10-14T11:30:00.000Z",
      "usuarioId": "670e0001f1b4c90011000099"
    }
  ],
  "estado": "ABIERTA"
}
```

---

### 9.6 Cierre y Arqueo de Caja (`POST /api/pos/caja/cierre`)
Finaliza el turno de caja. El dependiente cuenta físicamente el efectivo disponible en gaveta y envía `montoDeclaradoEfectivo`. El backend computa automáticamente el descuadre (`diferenciaEfectivo = montoDeclaradoEfectivo - montoEsperadoEfectivo`).

- **Método:** `POST`
- **Ruta:** `/api/pos/caja/cierre`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Payload:
```json
{
  "sesionId": "670e4100f1b4c90011889900",
  "montoDeclaradoEfectivo": 210.00,
  "notasCierre": "Cuadre exacto al cierre de turno tarde"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e4100f1b4c90011889900",
  "sucursalId": "670e1000f1b4c90011000001",
  "fechaApertura": "2026-10-14T08:00:00.000Z",
  "fechaCierre": "2026-10-14T18:00:00.000Z",
  "montoApertura": 100.00,
  "totalVentasEfectivo": 125.00,
  "totalVentasQR": 270.00,
  "totalIngresosManuales": 0.00,
  "totalEgresosManuales": 15.00,
  "montoEsperadoEfectivo": 210.00,
  "montoDeclaradoEfectivo": 210.00,
  "diferenciaEfectivo": 0.00,
  "notasCierre": "Cuadre exacto al cierre de turno tarde",
  "estado": "CERRADA"
}
```

---

## 10. Sucursales y Stock por Tienda

Permite a aplicaciones externas, terminales POS o dashboards satélites conocer la infraestructura física de tiendas y consultar el stock exacto desglosado por local.

### 10.1 Listado de Sucursales (`GET /api/admin/sucursales`)
Obtiene la lista de tiendas físicas, almacenes centrales y puntos de retiro registrados en el sistema.

- **Método:** `GET`
- **Ruta:** `/api/admin/sucursales`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Respuesta Exitosa (HTTP 200):
```json
[
  {
    "_id": "670e1000f1b4c90011000001",
    "nombre": "Almacén Central",
    "codigo": "ALM-CENTRAL",
    "tipo": "ALMACEN_CENTRAL",
    "direccion": "Zona Industrial Calle 8 #450",
    "ciudad": "La Paz",
    "telefono": "59178901234",
    "permiteVentaPOS": true,
    "permiteDespachoWeb": true,
    "permiteRetiroCliente": false,
    "requiereAperturaCaja": false,
    "activa": true,
    "esAlmacenPrincipal": true
  },
  {
    "_id": "670e1000f1b4c90011000002",
    "nombre": "Tienda 1 - San Miguel",
    "codigo": "TDA-SM",
    "tipo": "TIENDA_FISICA",
    "direccion": "Av. Montenegro #1234",
    "ciudad": "La Paz",
    "telefono": "59170123456",
    "permiteVentaPOS": true,
    "permiteDespachoWeb": false,
    "permiteRetiroCliente": true,
    "requiereAperturaCaja": true,
    "activa": true,
    "esAlmacenPrincipal": false
  }
]
```

---

### 10.2 Desglose de Stock por Sucursal (`GET /api/admin/productos/:id/stock-sucursales`)
Retorna los niveles de stock físico, reservado y disponible de todas las variantes de un producto específico, clasificados por cada sucursal activa.

- **Método:** `GET`
- **Ruta:** `/api/admin/productos/:id/stock-sucursales`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Ejemplo de Petición:
```bash
curl -X GET "https://control-ventas-azure.vercel.app/api/admin/productos/670e10a2f1b4c90012345678/stock-sucursales" \
  -H "Authorization: Bearer <accessToken>"
```

#### Respuesta Exitosa (HTTP 200):
```json
[
  {
    "_id": "670e2200f1b4c90011334401",
    "productoId": "670e10a2f1b4c90012345678",
    "varianteId": "var-alp-neg-m",
    "sucursalId": {
      "_id": "670e1000f1b4c90011000001",
      "nombre": "Almacén Central",
      "codigo": "ALM-CENTRAL",
      "tipo": "ALMACEN_CENTRAL",
      "permiteVentaPOS": true,
      "activa": true
    },
    "stockFisico": 6,
    "stockReservado": 1,
    "stockMinimo": 2
  },
  {
    "_id": "670e2200f1b4c90011334402",
    "productoId": "670e10a2f1b4c90012345678",
    "varianteId": "var-alp-neg-m",
    "sucursalId": {
      "_id": "670e1000f1b4c90011000002",
      "nombre": "Tienda 1 - San Miguel",
      "codigo": "TDA-SM",
      "tipo": "TIENDA_FISICA",
      "permiteVentaPOS": true,
      "activa": true
    },
    "stockFisico": 2,
    "stockReservado": 0,
    "stockMinimo": 1
  }
]
```

---

### 10.3 Detalle y Actualización de Sucursal (`GET/PUT/PATCH /api/admin/sucursales/:id`)
Permite consultar, modificar la configuración operativa o activar/desactivar una sucursal específica.

- **`GET /api/admin/sucursales/:id`**: Retorna la ficha técnica de la sucursal y sus banderas operativas (`permiteVentaPOS`, `permiteDespachoWeb`, `permiteRetiroCliente`, `requiereAperturaCaja`).
- **`PUT /api/admin/sucursales/:id`**: Actualiza datos de la tienda física o almacén (`nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, flags operativos y `esAlmacenPrincipal`).
  ```json
  {
    "nombre": "Tienda 1 - San Miguel",
    "tipo": "TIENDA_FISICA",
    "direccion": "Av. Montenegro #1234",
    "ciudad": "La Paz",
    "telefono": "59170123456",
    "permiteVentaPOS": true,
    "permiteDespachoWeb": false,
    "permiteRetiroCliente": true,
    "requiereAperturaCaja": true,
    "esAlmacenPrincipal": false
  }
  ```
- **`PATCH /api/admin/sucursales/:id`**: Modifica el estado activo/inactivo (`{ "activa": boolean }`).
  > ⚠️ **Regla de Consistencia:** No se permite desactivar una sucursal si está marcada como almacén principal único (`esAlmacenPrincipal: true`), respondiendo `HTTP 400 Bad Request` para garantizar que siempre exista un almacén central de despacho.

---

## 11. Compras de Proveedores y Reemplazo Atómico

Permite a los administradores registrar abastecimiento de mercadería con recálculo automático de Costo Promedio Ponderado (CPP), anular compras con reversión completa o corregir compras erróneas mediante reemplazo atómico en transacción.

### 11.1 Listar Compras (`GET /api/compras`)
Obtiene el historial paginado de compras registradas.

- **Método:** `GET`
- **Ruta:** `/api/compras?page=1&limit=20`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "compras": [
    {
      "_id": "670e5000f1b4c90011990011",
      "numeroCompra": "COM-261020-001",
      "fecha": "2026-10-20T10:00:00.000Z",
      "proveedor": "Textiles del Valle S.R.L.",
      "monedaOrigen": "PEN",
      "tipoCambio": 1.95,
      "totalMonedaOrigen": 1000.00,
      "totalBOB": 1950.00,
      "estado": "COMPLETADA",
      "items": [
        {
          "productoId": "670e10a2f1b4c90012345678",
          "varianteId": "var-alp-neg-m",
          "cantidad": 20,
          "costoUnitarioBOB": 97.50,
          "totalLineaBOB": 1950.00
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

---

### 11.2 Registrar Compra con CPP (`POST /api/compras`)
Registra una adquisición formal de prendas.  
**Efectos inmediatos en el sistema:**
1. Incrementa el `stockFisico` en el `NivelStock` de la sucursal de destino y en el catálogo global de variantes.
2. Recalcula el **Costo Promedio Ponderado (CPP)** de cada variante en moneda nacional (BOB).
3. Genera el asiento de Kárdex de tipo `ENTRADA` con el costo unitario y total.
4. Descuenta los fondos egresados de la cuenta de tesorería seleccionada (`CuentaDinero`).

- **Método:** `POST`
- **Ruta:** `/api/compras`
- **Auth:** `Authorization: Bearer <accessToken>` (`ADMIN`)

#### Payload:
```json
{
  "sucursalDestinoId": "670e1000f1b4c90011000001",
  "cuentaDineroId": "670e2000f1b4c90011440022",
  "proveedor": "Textiles del Valle S.R.L.",
  "comprobanteReferencia": "FAC-9842",
  "monedaOrigen": "PEN",
  "tipoCambio": 1.95,
  "notas": "Lote de temporada invierno confeccionado en Puno",
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "color": "Negro",
      "colorSecundario": "Gris",
      "talla": "M",
      "cantidad": 20,
      "costoUnitarioOrigen": 50.00
    }
  ]
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "message": "Compra registrada correctamente",
  "compra": {
    "_id": "670e5000f1b4c90011990011",
    "numeroCompra": "COM-261020-001",
    "estado": "COMPLETADA",
    "totalBOB": 1950.00,
    "items": [
      {
        "productoId": "670e10a2f1b4c90012345678",
        "varianteId": "var-alp-neg-m",
        "cantidad": 20,
        "costoUnitarioBOB": 97.50,
        "nuevoCostoPromedioBOB": 89.64,
        "nuevoStock": 28
      }
    ]
  }
}
```

---

### 11.3 Detalle de Compra y Snapshots (`GET /api/compras/:id`)
Permite consultar el comprobante de compra con snapshots de auditoría inmutables (costo anterior, costo nuevo, stock antes y después).

- **Método:** `GET`
- **Ruta:** `/api/compras/670e5000f1b4c90011990011`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

---

### 11.4 Anular Compra con Reversión (`DELETE /api/compras/:id`)
Anula una compra errónea o cancelada con el proveedor.  
**Efectos de reversión atómica:**
1. Descuenta las unidades del inventario de la sucursal de destino y del catálogo global.
2. Reintegra el dinero egresado a la cuenta bancaria o caja física de tesorería (`CuentaDinero`).
3. Registra una contra-anotación en Kárdex.
4. Marca el estado de la compra como `ANULADA` guardando `anuladaPor`, `fechaAnulacion` y `motivoAnulacion`.

- **Método:** `DELETE`
- **Ruta:** `/api/compras/670e5000f1b4c90011990011`
- **Auth:** `Authorization: Bearer <accessToken>` (`ADMIN` o `VENDEDOR`)

#### Payload (Opcional):
```json
{
  "motivo": "Mercadería devuelta por fallas de tejido en costuras"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Compra anulada exitosamente. Stock y egresos monetarios revertidos.",
  "compra": {
    "_id": "670e5000f1b4c90011990011",
    "estado": "ANULADA",
    "motivoAnulacion": "Mercadería devuelta por fallas de tejido en costuras"
  }
}
```

---

### 11.5 Reemplazo Atómico / Clonación Corregida (`PUT /api/compras/:id`)
Permite corregir una compra ya registrada cuando el usuario digitó cantidades incorrectas, costos equivocados o variantes erradas.  
**Garantía Transaccional ACID:**
En una única operación atómica de MongoDB, el sistema:
1. Revierte la compra previa (liberando stocks y restituyendo saldos financieros en memoria/transacción).
2. Registra la nueva versión corregida.
3. Vincula las referencias cruzadas `reemplazaACompraId` y `reemplazadaPorCompraId` para una auditoría contable inalterable.

- **Método:** `PUT`
- **Ruta:** `/api/compras/670e5000f1b4c90011990011`
- **Auth:** `Authorization: Bearer <accessToken>` (`ADMIN` o `VENDEDOR`)

#### Payload:
Envía el mismo esquema de registro de compra (`createCompraSchema`) con los datos corregidos, pudiendo adjuntar el campo opcional `motivo`:
```json
{
  "sucursalDestinoId": "670e1000f1b4c90011000001",
  "cuentaDineroId": "670e2000f1b4c90011440022",
  "proveedor": "Textiles del Valle S.R.L.",
  "comprobanteReferencia": "FAC-9842",
  "monedaOrigen": "PEN",
  "tipoCambio": 1.95,
  "motivo": "Corrección de cantidad: llegaron 18 prendas en lugar de 20",
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "color": "Negro",
      "colorSecundario": "Gris",
      "talla": "M",
      "cantidad": 18,
      "costoUnitarioOrigen": 50.00
    }
  ]
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Compra corregida y reemplazada exitosamente",
  "compra": {
    "_id": "670e5099f1b4c90011990099",
    "numeroCompra": "COM-261020-002",
    "estado": "COMPLETADA",
    "reemplazaACompraId": "670e5000f1b4c90011990011",
    "totalBOB": 1755.00
  }
}
```

---

### 11.6 Actualización de Metadatos de Compra (`PATCH /api/compras/:id`)
Permite corregir notas, fecha, proveedor o el número de factura/comprobante de referencia de una compra completada sin alterar cantidades de inventario ni movimientos contables.

- **Método:** `PATCH`
- **Ruta:** `/api/compras/:id`
- **Auth:** `Authorization: Bearer <accessToken>` (`ADMIN` o `VENDEDOR`)

#### Payload:
```json
{
  "proveedor": "Textiles del Valle S.R.L. - Sucursal Puno",
  "comprobanteReferencia": "FAC-9842-RECTIFICADA",
  "notas": "Se adjuntó factura electrónica escaneada por el proveedor",
  "fecha": "2026-10-20T10:00:00.000Z"
}
```

#### Respuesta Exitosa (HTTP 200):
```json
{
  "message": "Compra actualizada exitosamente",
  "compra": {
    "_id": "670e5000f1b4c90011990011",
    "numeroCompra": "COM-261020-001",
    "proveedor": "Textiles del Valle S.R.L. - Sucursal Puno",
    "comprobanteReferencia": "FAC-9842-RECTIFICADA",
    "notas": "Se adjuntó factura electrónica escaneada por el proveedor"
  }
}
```

---

## 12. Traspasos de Mercadería entre Sucursales

Permite mover existencias entre tiendas físicas y almacenes centrales con flujo de dos pasos (Despacho en origen $\to$ Recepción en destino) para prevenir pérdidas de inventario en tránsito.

### 12.1 Listar Traspasos (`GET /api/admin/traspasos`)
Consulta las solicitudes de traspaso de inventario.

- **Método:** `GET`
- **Ruta:** `/api/admin/traspasos?estado=SOLICITADA&sucursalId=670e1000f1b4c90011000001`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

---

### 12.2 Solicitar Traspaso (`POST /api/admin/traspasos`)
Crea una solicitud formal de traspaso de prendas entre sucursales en estado `SOLICITADA`. Valida que la sucursal de origen cuente con stock suficiente.

- **Método:** `POST`
- **Ruta:** `/api/admin/traspasos`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Payload:
```json
{
  "sucursalOrigenId": "670e1000f1b4c90011000001",
  "sucursalDestinoId": "670e1000f1b4c90011000002",
  "notas": "Reposición de stock para fin de semana en Tienda San Miguel",
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "cantidad": 5
    }
  ]
}
```

#### Respuesta Exitosa (HTTP 201):
```json
{
  "_id": "670e6000f1b4c90011220033",
  "numeroTraspaso": "TRS-261020-001",
  "sucursalOrigenId": "670e1000f1b4c90011000001",
  "sucursalDestinoId": "670e1000f1b4c90011000002",
  "estado": "SOLICITADA",
  "items": [
    {
      "productoId": "670e10a2f1b4c90012345678",
      "varianteId": "var-alp-neg-m",
      "cantidad": 5
    }
  ]
}
```

---

### 12.3 Despachar Traspaso (`POST /api/admin/traspasos/:id/despachar`)
El encargado del almacén o sucursal de origen entrega la mercadería al transporte o chofer.  
**Efecto:** Descuenta las existencias físicas de la sucursal de origen en `NivelStock` y asienta el movimiento `TRASPASO_SALIDA` en Kárdex. El traspaso pasa a estado `DESPACHADA`.

- **Método:** `POST`
- **Ruta:** `/api/admin/traspasos/670e6000f1b4c90011220033/despachar`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e6000f1b4c90011220033",
  "estado": "DESPACHADA",
  "fechaDespacho": "2026-10-20T11:00:00.000Z"
}
```

---

### 12.4 Recibir Traspaso (`POST /api/admin/traspasos/:id/recibir`)
El encargado de la sucursal de destino verifica la mercadería física recibida y confirma la entrada.  
**Efecto:** Incrementa las existencias físicas en la sucursal de destino en `NivelStock` y asienta el movimiento `TRASPASO_ENTRADA` en Kárdex. El traspaso pasa a estado `RECIBIDA`.

- **Método:** `POST`
- **Ruta:** `/api/admin/traspasos/670e6000f1b4c90011220033/recibir`
- **Auth:** `Authorization: Bearer <accessToken>` (`VENDEDOR` o `ADMIN`)

#### Respuesta Exitosa (HTTP 200):
```json
{
  "_id": "670e6000f1b4c90011220033",
  "estado": "RECIBIDA",
  "fechaRecepcion": "2026-10-20T12:30:00.000Z"
}
```

