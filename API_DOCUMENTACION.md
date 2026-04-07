# Documentacion API - Control Ventas

Base URL en desarrollo: `/api`

## Autenticacion y autorizacion

- La API usa un modelo **híbrido**:
  - NextAuth (JWT en cookie httpOnly) para el panel interno.
  - Token JWT tradicional (`Authorization: Bearer <token>`) emitido por `/api/auth/login` para acceso desde clientes externos o web.
- Middleware protege rutas, rechaza spoofing de headers y agrega info interna confiable:
  - `x-user-id`
  - `x-user-role`
- El mismo middleware controla tambien rutas web:
  - `/dashboard/**` requiere sesion valida y redirige segun rol.
  - `/dashboard` redirige a `/dashboard/admin` o `/dashboard/vendedor`.
  - `/login` y `/register` siguen siendo publicas; solo redirigen al dashboard correspondiente si ya existe sesion.
- Rutas publicas:
  - `POST /api/auth/signup`
  - `GET|POST /api/auth/[...nextauth]`
  - `GET /api/productos/publicos`
  - `GET /api/productos/publicos/:id`
- Rutas protegidas:
  - Solo `ADMIN`: `/api/admin/**`, `/api/reportes/**`, `/api/usuarios/**`, `/api/uploads/**`
  - `ADMIN` o `VENDEDOR`: `/api/productos/**`, `/api/ventas/**`, `/api/inventario/**`
  - `ADMIN` o `VENDEDOR`: `/api/orders/**`
  - `ADMIN` o `VENDEDOR`: `POST /api/fulfillment`, `PATCH /api/fulfillment/**`
  - `ADMIN` o `VENDEDOR`: `/api/pos/**`
  - `CLIENTE`: `/api/cart/**`
  - `CLIENTE`: `POST /api/ventas` (solo `tipoVenta: WEB`), `GET /api/orders/**`, `GET /api/fulfillment/:orderId`, `/api/mis-pedidos/**`, `/api/customers/me/**`
  - `CLIENTE`, `ADMIN` o `VENDEDOR`: `/api/payments/**`

## Formato de error de validacion (Zod)

Status: `400`

```json
{
  "message": "Datos inválidos",
  "errors": [
    { "field": "campo", "message": "detalle" }
  ]
}
```

## Endpoints

## Garantias de consistencia

- Los flujos criticos ahora corren dentro de transacciones MongoDB:
  - `POST /api/inventario`
  - `POST /api/ventas`
  - `POST /api/orders/checkout`
  - `POST /api/payments`
  - `POST /api/payments/:id/confirm`
  - `POST /api/payments/:id/fail`
  - `POST /api/payments/:id/refund`
- Si una operacion critica falla a mitad del proceso, el backend revierte los cambios del bloque transaccional para evitar:
  - stock descontado sin venta
  - pedido creado sin reserva
  - pago confirmado sin venta/pedido actualizados
  - devoluciones con stock o movimientos incompletos
- Requisito de infraestructura:
  - para que estas transacciones funcionen en produccion, MongoDB debe correr como `replica set` o `cluster sharded`
  - si el backend detecta una base `standalone`, los flujos criticos transaccionales responderan `503`

### Uploads (solo ADMIN)

### Migraciones Legacy (solo ADMIN)

#### `GET /api/admin/migrations/legacy`
Obtiene el estado del backfill legacy para saber cuanto falta migrar al core nuevo.

Respuesta `200`:

```json
{
  "totals": {
    "sales": 120,
    "orders": 145,
    "payments": 118,
    "fulfillments": 140
  },
  "pendingBackfill": {
    "salesWithoutOrder": 5,
    "saleBackedOrdersWithoutPayment": 12,
    "ordersWithoutFulfillment": 3
  },
  "samples": {
    "salesWithoutOrder": ["ventaId1"],
    "saleBackedOrdersWithoutPayment": ["orderId1"],
    "ordersWithoutFulfillment": ["orderId2"]
  },
  "compatibility": {
    "legacyFallbackStillRequired": true,
    "readyToDisableLegacyFallback": false
  }
}
```

Notas:
- `salesWithoutOrder`: ventas historicas todavia no migradas a `Order`.
- `saleBackedOrdersWithoutPayment`: pedidos ligados a una venta pero aun sin `PaymentTransaction`.
- `ordersWithoutFulfillment`: pedidos sin documento logistico sincronizado.

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: no autorizado.
- `500`

#### `GET /api/admin/ops/overview`
Obtiene el estado operativo del sistema central.

Incluye:

- runtime de MongoDB
- soporte de transacciones
- estado declarado de backups
- alertas operativas
- estado del backfill legacy
- eventos recientes de auditoria

Respuesta `200`:

```json
{
  "requestId": "0d5c3d74-3f72-4d7f-9d7c-1f7cf4d0a111",
  "timestamp": "2026-04-04T19:00:00.000Z",
  "runtime": {
    "connected": true,
    "transactionsSupported": true,
    "topology": "REPLICA_SET",
    "dbName": "control_ventas",
    "serverStatus": "connected"
  },
  "backup": {
    "enabled": true,
    "provider": "atlas",
    "target": "s3://bucket/backups",
    "retentionDays": 7,
    "lastBackupAt": "2026-04-04T18:00:00.000Z",
    "maxAgeHours": 24,
    "stale": false
  },
  "alerts": [],
  "legacy": {},
  "metrics": {},
  "recentAuditEvents": []
}
```

Respuestas:
- `200`
- `401`
- `403`
- `500`

#### `GET /api/admin/audit-events?limit=50`
Lista eventos recientes de auditoria.

Notas:
- `limit`: `1..200`
- Registra acciones criticas como:
  - checkout
  - pagos
  - ventas
  - fulfillment
  - ajustes manuales de inventario
  - migraciones
  - verificaciones E2E

Respuestas:
- `200`
- `401`
- `403`
- `500`

#### `POST /api/admin/ops/verify-core`
Ejecuta una verificacion end-to-end real del core usando datos temporales.

Body:

```json
{
  "cleanup": true,
  "runLegacyMigration": true,
  "legacyMigrationLimit": 500
}
```

Flujos verificados:

- checkout desde carrito
- pago confirmado
- entrega (`READY -> IN_TRANSIT -> DELIVERED`)
- pago fallido
- reembolso
- venta POS con escaneo

Notas:
- Si `cleanup = true`, elimina al final los datos temporales creados.
- Si `runLegacyMigration = true`, primero ejecuta backfill legacy antes de validar el core.
- La respuesta incluye `legacyFallbackStillRequired` para saber si aun hace falta mantener compatibilidad legacy.

Respuestas:
- `201`
- `400`
- `401`
- `403`
- `500`

#### `POST /api/admin/migrations/legacy`
Ejecuta el backfill incremental hacia el core nuevo.

Body:

```json
{
  "limit": 100,
  "dryRun": false,
  "steps": ["ORDERS", "PAYMENTS", "FULFILLMENTS"]
}
```

Reglas:
- `limit`: `1..500`, controla cuantos registros procesa por paso.
- `dryRun: true`: no escribe nada; solo devuelve el estado y lo pendiente.
- `steps` permite ejecutar solo una parte del backfill:
  - `ORDERS`
  - `PAYMENTS`
  - `FULFILLMENTS`
- Cada registro se procesa en su propia transaccion Mongo para evitar migraciones parciales.
- El endpoint es idempotente: si un registro ya fue migrado, lo marca como `skipped`.

Respuesta `201`:

```json
{
  "dryRun": false,
  "limit": 100,
  "steps": ["ORDERS", "PAYMENTS", "FULFILLMENTS"],
  "processed": {
    "ordersCreated": 5,
    "paymentsCreated": 12,
    "fulfillmentsCreated": 3
  },
  "skipped": {
    "orders": 0,
    "payments": 2,
    "fulfillments": 0
  },
  "errors": [],
  "before": {},
  "after": {}
}
```

Respuestas:
- `200`: cuando `dryRun = true`
- `201`: migracion ejecutada
- `400`: validacion
- `401`: no autenticado
- `403`: no autorizado
- `500`

### Health

#### `GET /api/health`
Estado basico del sistema y de MongoDB.

Respuesta `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-04-04T18:30:00.000Z",
  "services": {
    "mongodb": {
      "connected": true,
      "transactionsSupported": true,
      "topology": "REPLICA_SET",
      "dbName": "control_ventas",
      "serverStatus": "connected"
    }
  }
}
```

Notas:
- `status = ok`: Mongo conectado y con soporte de transacciones.
- `status = degraded`: Mongo conectado pero sin soporte transaccional o con estado degradado.
- Este endpoint es publico para que web/app o infraestructura puedan verificar readiness.

Respuestas:
- `200`
- `500`

#### `POST /api/uploads/variantes`
Sube una imagen de variante a Cloudinary y devuelve la URL segura.

Content-Type:
- `multipart/form-data`

Body:
- `file`: archivo de imagen obligatorio

Validaciones:
- Solo acepta archivos `image/*`
- Tamano maximo: `5 MB`

Respuesta `201`:

```json
{
  "url": "https://res.cloudinary.com/.../image/upload/v1234567890/control-ventas/variantes/archivo.jpg"
}
```

Respuestas:
- `201`
- `400`: archivo faltante, tipo invalido o tamano excedido
- `403`: no autorizado
- `500`: error al subir a Cloudinary

Notas:
- El endpoint recibe un solo archivo por request.
- Para variantes con varias imagenes, el frontend realiza multiples uploads y luego guarda las URLs resultantes en `variantes[].imagenes[]`.

---

### Auth

#### `POST /api/auth/signup`
Registro de usuario cliente.

Body:

```json
{
  "email": "cliente@correo.com",
  "password": "123456",
  "fullname": "Nombre Completo",
  "role": "CLIENTE"
}
```

Notas:
- `email`, `password`, `fullname` son obligatorios.
- `password` minimo 6 caracteres.
- Solo se acepta rol `CLIENTE`; cualquier otro valor se guarda como `CLIENTE`.
- Al registrar un cliente, el backend crea tambien su `CustomerProfile` base para poder guardar direcciones y preferencias de entrega.

Respuestas:
- `201`: usuario creado.
- `400`: campos invalidos.
- `409`: email ya registrado.
- `500`: error interno.

#### `GET|POST /api/auth/[...nextauth]`
Ruta interna de NextAuth para login/sesion (`credentials`: email + password).

#### `POST /api/auth/login`
Endpoint explícito para sistemas de terceros. Devuelve tokens fijos y datos del usuario.

Body:

```json
{
  "email": "usuario@correo.com",
  "password": "mi-password"
}
```

Respuestas:
- `200`: Login exitoso. Retorna:

```json
{
  "message": "Login exitoso",
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "64abcdef1234567890abcdef",
    "email": "usuario@correo.com",
    "fullname": "Nombre Completo",
    "role": "CLIENTE"
  }
}
```
- `400`: faltan credenciales.
- `401`: credenciales incorrectas o usuario inactivo.
- `500`: error interno.

---

### Usuarios (solo ADMIN)

#### `GET /api/usuarios`
Lista usuarios (sin password), ordenados por fecha descendente.

Respuestas:
- `200`
- `403`: no autorizado.

#### `POST /api/usuarios`
Crea usuario.

Body:

```json
{
  "fullname": "Administrador",
  "email": "admin@correo.com",
  "password": "123456",
  "role": "ADMIN",
  "isActive": true
}
```

Validaciones:
- `fullname`: 3..100
- `email`: formato valido
- `password`: 6..100
- `role`: `ADMIN | VENDEDOR | CLIENTE`
- `isActive`: boolean

Respuestas:
- `201`
- `400`: validacion.
- `403`: no autorizado.
- `409`: email existente.

#### `PUT /api/usuarios/:id`
Actualiza usuario por ID.

Body (todos opcionales):

```json
{
  "fullname": "Nuevo Nombre",
  "email": "nuevo@correo.com",
  "password": "nueva-clave",
  "role": "VENDEDOR",
  "isActive": true
}
```

Notas:
- Si `password` llega vacio, no se actualiza.
- Si `password` llega con contenido, se vuelve a hashear.

Respuestas:
- `200`
- `400`: validacion.
- `403`: no autorizado.
- `404`: usuario no encontrado.
- `500`

---

### Perfil

#### `GET /api/perfil`
Obtiene los datos del usuario autenticado (excluyendo password).

Notas:
- Para usuarios `CLIENTE`, la respuesta ahora puede incluir tambien:
  - `customerProfile`
  - `defaultAddress`

Respuestas:
- `200`
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `500`

#### `PUT /api/perfil`
Actualiza el perfil del usuario autenticado.

Body (todos opcionales):

```json
{
  "fullname": "Nuevo Nombre",
  "email": "nuevo@correo.com",
  "password": "nueva-clave"
}
```

Notas:
- Si el `email` ya existe en otro usuario, devuelve error.
- Si `password` no se envia o llega vacio, no se actualiza.

Respuestas:
- `200`
- `400`: validacion de campos.
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `409`: email ya en uso.
- `500`

---

### Cart

#### `GET /api/cart`
Obtiene el carrito persistente del cliente autenticado.

Notas:
- Si el cliente aun no tiene carrito, el backend crea uno vacio automaticamente.

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: solo clientes.
- `500`

#### `DELETE /api/cart`
Vacia completamente el carrito del cliente autenticado.

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: solo clientes.
- `500`

#### `POST /api/cart/items`
Agrega un producto al carrito.

Body:

```json
{
  "productoId": "507f1f77bcf86cd799439011",
  "variantId": "67ee00000000000000000001",
  "color": "Negro",
  "talla": "M",
  "cantidad": 2
}
```

Reglas:
- Si el item ya existe en el carrito, el backend suma la cantidad.
- Si la cantidad total supera el `stockDisponible`, responde `400`.

Respuestas:
- `201`
- `400`: validacion o stock insuficiente.
- `401`: no autenticado.
- `403`: solo clientes.
- `404`: producto o variante no encontrada.
- `500`

#### `PUT /api/cart/items/:itemId`
Actualiza la cantidad de un item del carrito.

Body:

```json
{
  "cantidad": 3
}
```

Respuestas:
- `200`
- `400`: validacion, `itemId` invalido o stock insuficiente.
- `401`: no autenticado.
- `403`: solo clientes.
- `404`: item, producto o variante no encontrada.
- `500`

#### `DELETE /api/cart/items/:itemId`
Elimina un item del carrito.

Respuestas:
- `200`
- `400`: `itemId` invalido.
- `401`: no autenticado.
- `403`: solo clientes.
- `404`: item no encontrado.
- `500`

---

### Customers

#### `GET /api/customers/me`
Obtiene el contexto completo del cliente autenticado.

Respuesta `200`:

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "Cliente Demo",
    "email": "cliente@correo.com",
    "role": "CLIENTE",
    "isActive": true,
    "createdAt": "2026-04-04T10:00:00.000Z",
    "updatedAt": "2026-04-04T10:00:00.000Z"
  },
  "profile": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "phone": "76543210",
    "documentType": "CI",
    "documentNumber": "1234567",
    "defaultDeliveryMethod": "HOME_DELIVERY",
    "notes": null
  },
  "defaultAddress": {
    "_id": "507f1f77bcf86cd799439013",
    "label": "Casa",
    "recipientName": "Cliente Demo",
    "phone": "76543210",
    "department": "La Paz",
    "city": "La Paz",
    "zone": "Zona Sur",
    "addressLine": "Calle 10 #123",
    "reference": "Porton azul",
    "postalCode": null,
    "country": "Bolivia",
    "isDefault": true,
    "isActive": true
  }
}
```

Notas:
- Si el cliente aun no tiene `CustomerProfile`, el backend lo crea automaticamente al consultar este endpoint.

Respuestas:
- `200`
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `500`

#### `PUT /api/customers/me`
Actualiza el perfil comercial del cliente autenticado.

Body:

```json
{
  "fullname": "Cliente Demo",
  "phone": "76543210",
  "documentType": "CI",
  "documentNumber": "1234567",
  "defaultDeliveryMethod": "HOME_DELIVERY",
  "notes": "Entregar por las tardes"
}
```

Notas:
- `fullname` actualiza tambien el nombre del `User`.
- `email` y `password` siguen gestionandose por `/api/perfil`.

Respuestas:
- `200`
- `400`: validacion.
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `500`

#### `GET /api/customers/me/addresses`
Lista las direcciones activas del cliente autenticado.

Notas:
- Ordena primero la direccion por defecto y luego por fecha de creacion descendente.

Respuestas:
- `200`
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `500`

#### `POST /api/customers/me/addresses`
Crea una nueva direccion para el cliente autenticado.

Body:

```json
{
  "label": "Casa",
  "recipientName": "Cliente Demo",
  "phone": "76543210",
  "department": "La Paz",
  "city": "La Paz",
  "zone": "Zona Sur",
  "addressLine": "Calle 10 #123",
  "reference": "Porton azul",
  "postalCode": "",
  "country": "Bolivia",
  "isDefault": true
}
```

Reglas:
- La primera direccion creada se marca automaticamente como `isDefault: true`.
- Si se envia `isDefault: true`, el backend desmarca cualquier otra direccion por defecto.

Respuestas:
- `201`
- `400`: validacion.
- `401`: no autenticado.
- `404`: usuario no encontrado.
- `500`

#### `PUT /api/customers/me/addresses/:addressId`
Actualiza una direccion existente del cliente autenticado.

Body:
- Todos los campos son opcionales.

Reglas:
- Si se envia `isDefault: true`, esa direccion pasa a ser la direccion por defecto.
- Si una direccion pierde el estado por defecto y no queda otra activa, el backend promueve automaticamente otra direccion activa.

Respuestas:
- `200`
- `400`: validacion o `addressId` invalido.
- `401`: no autenticado.
- `404`: direccion no encontrada.
- `500`

#### `DELETE /api/customers/me/addresses/:addressId`
Elimina logicamente una direccion del cliente autenticado.

Notas:
- El backend marca la direccion como inactiva (`isActive: false`).
- Si era la direccion por defecto, promueve otra direccion activa automaticamente cuando exista.

Respuestas:
- `200`
- `400`: `addressId` invalido.
- `401`: no autenticado.
- `404`: direccion no encontrada.
- `500`

---

### Productos (ADMIN y VENDEDOR para lectura, solo ADMIN para escritura)

#### `GET /api/productos`
Lista todos los productos.

Notas:
- Cada variante puede incluir `imagenes[]`.
- Por compatibilidad pueden existir registros antiguos con `imagen`, pero el backend migra ese valor a `imagenes[]` al guardar.
- Cada variante ahora puede incluir `variantId`, que funciona como identificador estable para integraciones web/app.
- Cada variante tambien puede incluir:
  - `reservedStock`: stock retenido temporalmente por pedidos pendientes
  - `stockDisponible`: stock realmente disponible para nuevas ventas
- Query params opcionales:
  - `withStock=true`: devuelve productos listos para paneles de inventario, asegurando `stockTotal` y `stockMinimo` en la respuesta.

Respuestas:
- `200`
- `500`

#### `POST /api/productos` (solo ADMIN)
Crea producto y genera SKU.

Notas:
- Las imagenes de variantes se guardan como URL en `variantes[].imagenes[]`.
- El flujo recomendado es subir los archivos necesarios a `POST /api/uploads/variantes` y luego enviar las URLs al crear o actualizar el producto.
- Si por compatibilidad llega una imagen en formato base64 (`data:image/...`) o el campo legado `imagen`, el backend la sube a Cloudinary y la migra a `imagenes[]`.

Body:

```json
{
  "nombre": "Polera",
  "modelo": "Classic",
  "categoria": "Poleras",
  "precioVenta": 120,
  "precioCosto": 80,
  "variantes": [
    {
      "variantId": "67ee00000000000000000001",
      "color": "Negro",
      "talla": "M",
      "stock": 10,
      "descripcion": "Polera negra talla M",
      "imagenes": [
        "https://res.cloudinary.com/.../image/upload/v1234567890/control-ventas/variantes/polera-negra-m-1.jpg",
        "https://res.cloudinary.com/.../image/upload/v1234567890/control-ventas/variantes/polera-negra-m-2.jpg"
      ]
    }
  ]
}
```

Validaciones:
- `nombre`: 3..100
- `modelo`: 2..50
- `categoria`: string opcional, default "Chompas" (o ingresado por el usuario libremente).
- `precioVenta`: numero positivo
- `precioCosto`: numero positivo
- `precioVenta > precioCosto`
- `variantes[]` opcional (default `[]`)
- Variante:
  - `variantId?`: ObjectId string opcional. Si no se envia, el backend lo genera automaticamente.
  - `color`: requerido, max 50
  - `talla`: requerido, max 20
  - `stock`: entero >= 0
  - `descripcion?`: string opcional para detalles.
  - `imagenes?`: arreglo de URLs validas de Cloudinary o valores `data:image/...` validos para migracion/compatibilidad
  - `imagen?`: campo legado aceptado por compatibilidad; se migra a `imagenes[]`
  - `codigoBarra?`, `qrCode?`

Respuestas:
- `201`
- `400`: validacion.
- `403`: no autorizado.
- `409`: SKU duplicado.
- `500`

#### `GET /api/productos/:id`
Obtiene un producto por ID.

Respuestas:
- `200`
- `404`
- `500`

#### `GET /api/productos/publicos`
Catalogo publico para clientes.

Notas:
- No expone `precioCosto`.
- No expone `creadoPor`.
- No expone `variantes.codigoBarra` ni `variantes.qrCode`.
- Solo retorna productos con `estado != INACTIVO`.

Respuestas:
- `200`
- `500`

#### `GET /api/productos/publicos/:id`
Detalle publico de producto.

Notas:
- Mismos filtros de datos sensibles que `GET /api/productos/publicos`.
- Solo retorna producto si `estado != INACTIVO`.

Respuestas:
- `200`
- `400`: ID invalido.
- `404`
- `500`

#### `PUT /api/productos/:id` (solo ADMIN)
Actualiza producto por ID.

Comportamiento:
- Recalcula SKU si cambia `nombre` o `modelo`.
- Si el SKU nuevo ya existe en otro producto, devuelve `409`.
- Procesa variantes:
  - Si una variante no tiene `variantId`, el backend lo genera.
  - Si una variante ya existia, el backend preserva su `reservedStock`.
  - Si `imagenes[]` o `imagen` llegan con valores base64, los sube a Cloudinary y guarda solo URLs.
  - Si variante no tiene `codigoBarra`/`qrCode`, los genera.
  - Si se agrega variante nueva con stock > 0, registra movimiento de inventario (`ENTRADA`).
  - Si aumenta stock de variante existente, registra movimiento de inventario (`ENTRADA`).
  - Si una variante elimina o reemplaza una imagen previa de Cloudinary, intenta borrar el recurso anterior en Cloudinary.

Body:
- Todos los campos son opcionales.
- `variantes` puede enviarse completo para reemplazar el arreglo actual.
- Si no se envia `variantes`, el endpoint no modifica las variantes existentes.

Respuestas:
- `200`
- `400`: validacion.
- `401`: usuario no autenticado (header `x-user-id` invalido).
- `403`: no autorizado.
- `404`: producto no encontrado.
- `409`: SKU duplicado.
- `500`

#### `DELETE /api/productos/:id` (solo ADMIN)
Elimina producto.

Notas:
- Antes de eliminar el producto, intenta eliminar de Cloudinary las imagenes asociadas a las variantes.
- Si alguna variante tiene `reservedStock > 0`, el backend bloquea la eliminacion con `409`.

Respuestas:
- `200`
- `403`
- `404`
- `500`

#### `GET /api/productos/by-code/:code`
Busca producto por codigo de variante (`codigoBarra` o `qrCode`).

Respuestas:
- `200`:

```json
{
  "_id": "productoId",
  "nombre": "Polera",
  "modelo": "Classic",
  "precioVenta": 120,
  "variante": {
    "variantId": "67ee00000000000000000001",
    "color": "Negro",
    "talla": "M",
    "stock": 5,
    "reservedStock": 1,
    "stockDisponible": 4,
    "imagen": "url-portada-opcional",
    "imagenes": [
      "url-1-opcional",
      "url-2-opcional"
    ],
    "codigoBarra": "xxx",
    "qrCode": "yyy"
  }
}
```

- `400`: codigo no enviado o stock insuficiente.
- `404`: producto o variante no encontrada.
- `500`

---

### Inventario (ADMIN y VENDEDOR para lectura, solo ADMIN para ajuste manual)

#### `GET /api/inventario`
Lista movimientos de inventario (populate de producto y usuario).

Respuestas:
- `200`
- `500`

#### `POST /api/inventario` (solo ADMIN)
Ajuste manual de stock.

Body:

```json
{
  "productoId": "507f1f77bcf86cd799439011",
  "variantId": "67ee00000000000000000001",
  "color": "Negro",
  "talla": "M",
  "tipo": "ENTRADA",
  "cantidad": 5,
  "motivo": "Reposicion"
}
```

Validaciones:
- `productoId`: ObjectId valido
- `variantId?`: ObjectId string opcional. Si se envia, el backend intenta resolver primero la variante por este campo.
- `color`: requerido, max 50
- `talla`: requerido, max 20
- `tipo`: `ENTRADA | SALIDA | AJUSTE | DEVOLUCION`
- `cantidad`: entero, distinto de 0
- `motivo?`: max 200
- `referencia?`: max 100

Reglas:
- La variante se resuelve por `variantId` si llega; en caso contrario se usa compatibilidad por `color + talla`.
- `ENTRADA`: suma stock.
- `SALIDA`: resta stock (si no alcanza, `400`).
- `AJUSTE`: fija stock al valor absoluto de `cantidad`.
- Todo el ajuste y su movimiento asociado se guardan en una misma transaccion Mongo.
- Cada movimiento guarda tambien snapshots minimos:
  - `productoSnapshot.nombre`
  - `productoSnapshot.modelo`
  - `productoSnapshot.sku`
  - `variante.variantId`
  - `variante.codigoBarra`

Respuestas:
- `201`
- `400`: validacion/tipo invalido/stock insuficiente.
- `401`: usuario no autenticado.
- `403`: no autorizado.
- `404`: producto o variante no encontrada.
- `500`

#### `GET /api/inventario/:productoId`
Kardex por producto.

Respuestas:
- `200`
- `400`: ID invalido.
- `500`

---

### Ventas (ADMIN, VENDEDOR y CLIENTE con restricciones)

#### `POST /api/ventas`
Registra una venta y descuenta stock.

Body:

```json
{
  "items": [
    {
      "productoId": "507f1f77bcf86cd799439011",
      "variantId": "67ee00000000000000000001",
      "color": "Negro",
      "talla": "M",
      "cantidad": 2
    }
  ],
  "metodoPago": "EFECTIVO",
  "tipoVenta": "TIENDA",
  "descuento": 0,
  "delivery": {
    "method": "HOME_DELIVERY",
    "address": "Zona Sur, Calle 10, casa 123",
    "phone": "76543210"
  }
}
```

Validaciones:
- `items`: minimo 1
- item:
  - `productoId`: ObjectId valido
  - `variantId?`: ObjectId string opcional. Si se envia, el backend intenta resolver primero la variante por este campo.
  - `color`: requerido, max 50
  - `talla`: requerido, max 20
  - `cantidad`: entero positivo, max 1000
- `metodoPago`: `EFECTIVO | QR`
- `tipoVenta`: `WEB | APP_QR | TIENDA`
- `descuento?`: numero >= 0 y <= 100
- `delivery?`: objeto opcional
  - `method`: `WHATSAPP | PICKUP_LAPAZ | HOME_DELIVERY`
  - `pickupPoint`: requerido para PICKUP (`TELEFERICO_MORADO | TELEFERICO_ROJO | CORREOS`)
  - `address`: requerido para HOME_DELIVERY
  - `phone`: requerido para PICKUP y HOME_DELIVERY

Comportamiento:
- Valida existencia de producto y variante.
- La variante se resuelve por `variantId` si llega; en caso contrario se usa compatibilidad por `color + talla`.
- Valida stock suficiente.
- Descuenta stock por item.
- Crea movimiento de inventario (`SALIDA`, referencia `VENTA`).
- Incrementa `producto.totalVendidos`.
- Calcula:
  - `subtotal`
  - `gananciaTotal`
  - `total = subtotal - descuento + impuesto`
  - `impuesto` fijo en `0`
- Crea venta con:
  - `numeroVenta`: `V-${Date.now()}`
  - `estado`: `PAGADA`
  - `vendedor`: usuario autenticado (si rol `ADMIN`/`VENDEDOR`)
  - `cliente`: usuario autenticado (si rol `CLIENTE`)
- Crea tambien un `Order` espejo con:
  - `orderNumber`: `O-${Date.now()}`
  - `sourceSaleId`
  - `sourceSaleNumber`
  - `orderStatus`
  - `paymentStatus`
  - `fulfillmentStatus`
- Venta, salida de stock, movimientos y pedido espejo se confirman en una sola transaccion Mongo.
- Cada item guardado en la venta incluye snapshots minimos:
  - `productoSnapshot.nombre`
  - `productoSnapshot.modelo`
  - `productoSnapshot.sku`
  - `productoSnapshot.imagen`
  - `variante.variantId`
  - `variante.codigoBarra`
  - `variante.qrCode`

Regla de rol `CLIENTE`:
- Puede usar `POST /api/ventas` solo cuando `tipoVenta` es `WEB`.

Respuestas:
- `201`: Retorna objeto estable con campos principales (`_id`, `numeroVenta`, `estado`, `totales`, `items`, `delivery` si aplica) y `order`.
- `400`: validacion/stock insuficiente/ID invalido.
- `403`: no autorizado.
- `404`: producto o variante no encontrada.
- `500`

#### `GET /api/ventas`
Lista ventas (populate vendedor).

Respuestas:
- `200`
- `500`

#### `GET /api/ventas/:id`
Detalle de venta por ID (populate vendedor).

Respuestas:
- `200`
- `404`
- `500`

---

### Orders

#### `GET /api/orders`
Lista pedidos.

Reglas:
- `ADMIN` y `VENDEDOR`: obtienen todos los pedidos.
- `CLIENTE`: obtiene solo sus propios pedidos.

Notas:
- Los pedidos nuevos se generan a partir de `POST /api/ventas`.
- Esta coleccion es la nueva base para ecommerce y seguimiento operativo.
- Los pedidos web manejan ademas:
  - `stockReservationStatus`
  - `reservedAt`
  - `reservationExpiresAt`

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: no autorizado.
- `500`

#### `POST /api/orders/checkout`
Convierte el carrito del cliente autenticado en un pedido real.

Permisos:
- Solo `CLIENTE`.

Body:

```json
{
  "metodoPago": "QR",
  "addressId": "507f1f77bcf86cd799439013",
  "delivery": {
    "method": "HOME_DELIVERY",
    "phone": "76543210",
    "recipientName": "Cliente Demo"
  }
}
```

Reglas:
- El backend valida que el carrito no este vacio.
- Vuelve a validar existencia de producto, variante y stock antes de crear el pedido.
- Crea un `Order` con:
  - `channel = WEB`
  - `orderStatus = PENDING_PAYMENT`
  - `paymentStatus = PENDING`
- Reserva stock en cada variante con:
  - `stockReservationStatus = RESERVED`
  - `reservedAt`
  - `reservationExpiresAt`
- Luego vacia el carrito.
- No descuenta stock fisico en este paso; el stock se consume al confirmar el pago.
- La reserva expira automaticamente segun la configuracion actual del backend (15 minutos).
- La reserva, la creacion del pedido y el vaciado del carrito se ejecutan dentro de una sola transaccion Mongo.

Respuestas:
- `201`
- `400`: carrito vacio, validacion o stock insuficiente.
- `401`: no autenticado.
- `403`: solo clientes.
- `404`: producto, variante o direccion no encontrada.
- `500`

#### `GET /api/orders/:id`
Obtiene el detalle de un pedido.

Reglas:
- `ADMIN` y `VENDEDOR`: pueden consultar cualquier pedido.
- `CLIENTE`: solo puede consultar pedidos propios.

Respuestas:
- `200`
- `400`: ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `500`

#### `PATCH /api/orders/:id`
Actualiza estados operativos del pedido.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Body:

```json
{
  "orderStatus": "PREPARING",
  "paymentStatus": "PAID",
  "fulfillmentStatus": "PENDING"
}
```

Validaciones:
- Debe enviarse al menos uno de estos campos:
  - `orderStatus`: `PENDING_PAYMENT | CONFIRMED | PREPARING | READY | IN_TRANSIT | DELIVERED | CANCELLED`
  - `paymentStatus`: `PENDING | PAID | FAILED | REFUNDED`
  - `fulfillmentStatus`: `PENDING | READY | IN_TRANSIT | DELIVERED | NOT_APPLICABLE | CANCELLED`

Notas:
- Si `orderStatus` se actualiza a `CANCELLED` y no se envia `fulfillmentStatus`, el backend lo ajusta automaticamente a `CANCELLED`.
- Si el pedido tenia stock reservado y aun no estaba pagado, al cancelarlo el backend libera la reserva y marca `stockReservationStatus = RELEASED`.

Respuestas:
- `200`
- `400`: validacion o ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `500`

---

### Payments

#### `POST /api/payments`
Crea una transaccion de pago para un pedido.

Body:

```json
{
  "orderId": "507f1f77bcf86cd799439021",
  "metodoPago": "QR",
  "idempotencyKey": "checkout-123",
  "externalReference": "qr-session-001"
}
```

Reglas:
- Un pedido no puede tener mas de un pago confirmado.
- Si se envia un `idempotencyKey` ya usado, el backend devuelve la transaccion existente.
- Si el pedido ya perdio su reserva activa (`stockReservationStatus = RELEASED`) y no esta pagado, el backend responde `409`.
- La verificacion del pedido y la creacion de la transaccion de pago se ejecutan dentro de una misma transaccion Mongo.

Respuestas:
- `201`
- `400`: validacion o ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `409`: el pedido ya tiene un pago confirmado.
- `500`

#### `POST /api/payments/:id/confirm`
Confirma una transaccion de pago.

Body:

```json
{
  "externalReference": "qr-paid-001"
}
```

Reglas:
- Si el pedido aun no tiene `Venta` asociada, el backend:
  - consume stock reservado
  - registra movimientos de inventario
  - crea la `Venta`
  - enlaza `Order.sourceSaleId`
- Luego marca:
  - `payment.status = PAID`
  - `order.paymentStatus = PAID`
  - `order.orderStatus = CONFIRMED`
  - `order.stockReservationStatus = CONSUMED`
- Todo ese bloque corre en una sola transaccion Mongo.

Respuestas:
- `200`
- `400`: ID invalido, pago reembolsado o stock insuficiente.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pago, pedido, producto o variante no encontrada.
- `500`

#### `POST /api/payments/:id/fail`
Marca una transaccion de pago como fallida.

Body:

```json
{
  "reason": "QR expirado"
}
```

Respuestas:
- `200`
- `400`: ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pago o pedido no encontrado.
- `500`

Notas:
- Si el pedido tenia stock reservado y aun no estaba pagado, el backend libera esa reserva y cancela el pedido.
- La liberacion de reserva, el cambio de pago y la cancelacion del pedido se guardan atomica y transaccionalmente.

#### `POST /api/payments/:id/refund`
Reembolsa una transaccion de pago.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Body:

```json
{
  "reason": "Cliente cancelo el pedido"
}
```

Reglas:
- Si el pedido ya genero venta, el backend:
  - devuelve stock
  - registra movimiento `DEVOLUCION`
  - marca la venta como `CANCELADA`
- Luego marca:
  - `payment.status = REFUNDED`
  - `order.paymentStatus = REFUNDED`
  - `order.orderStatus = CANCELLED`
  - `order.stockReservationStatus = RELEASED`
- La devolucion de stock, el movimiento de inventario, la cancelacion de venta y el cambio de estados se ejecutan en una sola transaccion Mongo.

Respuestas:
- `200`
- `400`: ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pago o pedido no encontrado.
- `500`

---

### Fulfillment

#### `GET /api/fulfillment/:orderId`
Obtiene el estado logistico del pedido.

Permisos:
- `ADMIN` y `VENDEDOR`: pueden consultar cualquier pedido.
- `CLIENTE`: solo puede consultar fulfillment de pedidos propios.

Notas:
- Si el pedido aun no tiene documento de fulfillment, el backend lo sincroniza automaticamente desde `Order`.
- Pedidos sin entrega logistica real devuelven `status = NOT_APPLICABLE`.

Respuesta `200`:

```json
{
  "_id": "507f1f77bcf86cd799439030",
  "orderId": "507f1f77bcf86cd799439021",
  "orderNumber": "O-1712265600000",
  "channel": "WEB",
  "method": "HOME_DELIVERY",
  "status": "PENDING",
  "address": "Zona Sur, Calle 10 #123",
  "phone": "76543210",
  "recipientName": "Cliente Demo",
  "trackingCode": null,
  "courierName": null,
  "assignedTo": null,
  "notes": null,
  "preparedAt": null,
  "inTransitAt": null,
  "deliveredAt": null,
  "cancelledAt": null
}
```

Respuestas:
- `200`
- `400`: ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `500`

#### `POST /api/fulfillment`
Crea o sincroniza manualmente el fulfillment de un pedido.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Body:

```json
{
  "orderId": "507f1f77bcf86cd799439021",
  "trackingCode": "TRK-001",
  "courierName": "Repartidor Interno",
  "assignedTo": "507f1f77bcf86cd799439099",
  "notes": "Entregar por recepcion"
}
```

Notas:
- Si el fulfillment ya existe, el backend lo reutiliza y actualiza solo los campos manuales enviados.
- Si no existe, lo crea a partir del `Order` actual.

Respuestas:
- `201`
- `400`: validacion o IDs invalidos.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `500`

#### `PATCH /api/fulfillment/:id/status`
Actualiza el estado del fulfillment y sincroniza `Order.fulfillmentStatus`.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Body:

```json
{
  "status": "IN_TRANSIT",
  "trackingCode": "TRK-001",
  "courierName": "Moto 12",
  "notes": "Cliente contacto por WhatsApp"
}
```

Reglas:
- `READY`, `IN_TRANSIT` y `DELIVERED` requieren `paymentStatus = PAID`.
- El backend actualiza tambien el pedido:
  - `READY` -> `order.orderStatus = READY`
  - `IN_TRANSIT` -> `order.orderStatus = IN_TRANSIT`
  - `DELIVERED` -> `order.orderStatus = DELIVERED`
  - `CANCELLED` -> `order.orderStatus = CANCELLED`
- Se registran fechas automaticamente segun el estado:
  - `preparedAt`
  - `inTransitAt`
  - `deliveredAt`
  - `cancelledAt`

Respuestas:
- `200`
- `400`: validacion o ID invalido.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: fulfillment o pedido no encontrado.
- `409`: intento de avanzar entrega sin pago confirmado.
- `500`

---

### POS

#### `GET /api/pos/scan/:code`
Busca una variante por `codigoBarra` o `qrCode` para flujo de escaneo.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Notas:
- Reutiliza la logica central del catalogo.
- Responde solo si la variante tiene `stockDisponible > 0`.

Respuesta `200`:

```json
{
  "_id": "productoId",
  "nombre": "Polera",
  "modelo": "Classic",
  "precioVenta": 120,
  "scanSource": "BARCODE",
  "variante": {
    "variantId": "67ee00000000000000000001",
    "color": "Negro",
    "talla": "M",
    "stock": 5,
    "reservedStock": 1,
    "stockDisponible": 4,
    "codigoBarra": "xxx",
    "qrCode": "yyy"
  }
}
```

Respuestas:
- `200`
- `400`: codigo vacio o stock insuficiente.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: producto o variante no encontrada.
- `500`

#### `POST /api/pos/sales`
Registra una venta desde la app o flujo POS.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Body:

```json
{
  "items": [
    {
      "productoId": "507f1f77bcf86cd799439011",
      "variantId": "67ee00000000000000000001",
      "color": "Negro",
      "talla": "M",
      "cantidad": 1
    }
  ],
  "metodoPago": "QR",
  "descuento": 0
}
```

Reglas:
- El backend fuerza `tipoVenta = APP_QR`.
- Reutiliza la misma logica transaccional de `POST /api/ventas`.
- Crea:
  - venta
  - movimientos de inventario
  - pedido espejo
  - fulfillment sincronizado

Respuestas:
- `201`
- `400`: validacion o stock insuficiente.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: producto o variante no encontrada.
- `500`

#### `GET /api/pos/my-sales`
Lista las ventas POS del vendedor autenticado.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Notas:
- Filtra por `tipoVenta = APP_QR`.
- Filtra por `vendedor = usuario autenticado`.

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: no autorizado.
- `500`

#### `GET /api/pos/summary`
Resumen rapido de ventas POS del vendedor autenticado.

Permisos:
- Solo `ADMIN` y `VENDEDOR`.

Respuesta `200`:

```json
{
  "totalVentas": 15,
  "totalIngresos": 2400,
  "totalGanancia": 780,
  "totalDescuentos": 40,
  "efectivoVentas": 9,
  "qrVentas": 6
}
```

Respuestas:
- `200`
- `401`: no autenticado.
- `403`: no autorizado.
- `500`

---

### Mis pedidos (solo CLIENTE)

#### `GET /api/mis-pedidos`
Lista los pedidos del cliente autenticado, ordenados por fecha descendente.

Notas:
- Endpoint de compatibilidad. Para desarrollos nuevos de web/app, la fuente principal debe ser `/api/orders`.
- Ahora prioriza la coleccion `orders`.
- Si existen ventas antiguas sin `Order` asociado, aplica fallback a `ventas` para no perder historial.
- Mantiene compatibilidad devolviendo:
  - `numeroPedido`
  - `numeroVenta`
  - `estado`
  - `estadoPedido`
  - `estadoPago`
  - `estadoEntrega`
- Antes de listar, el backend intenta liberar reservas expiradas.
- No expone `precioCosto`, `ganancia` ni `gananciaTotal`.

Respuestas:
- `200`
- `403`: no autorizado.
- `500`

#### `GET /api/mis-pedidos/:id`
Detalle de un pedido propio del cliente autenticado.

Notas:
- Endpoint de compatibilidad. Para integraciones nuevas, usar `GET /api/orders/:id`.
- Busca primero en `orders` y luego hace fallback a `ventas` legacy.
- Si el pedido no pertenece al cliente autenticado, responde `404`.
- No expone campos de costo/ganancia.

Respuestas:
- `200`
- `400`: ID invalido.
- `403`: no autorizado.
- `404`: pedido no encontrado.
- `500`

---

### Reportes (solo ADMIN)

#### `GET /api/reportes`
Resumen global de ventas:

```json
{
  "totalVentas": 0,
  "gananciaTotal": 0,
  "cantidadVentas": 0,
  "totalDescuentos": 0,
  "pedidosCancelados": 0,
  "pedidosEntregados": 0,
  "ventasPorCanal": [],
  "transaccionesPorEstado": []
}
```

Si no hay datos, devuelve esos valores en cero.

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/ventas-diarias`
Agrupa por fecha (`createdAt`) en formato `YYYY-MM-DD`:

```json
[
  {
    "_id": "2026-03-05",
    "totalVentas": 500,
    "ganancia": 180,
    "cantidad": 4
  }
]
```

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/ventas-mensuales`
Agrupa por anio y mes:

```json
[
  {
    "_id": { "anio": 2026, "mes": 3 },
    "totalVentas": 12000,
    "ganancia": 4200,
    "cantidad": 85
  }
]
```

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/productos-top`
Top 10 productos mas vendidos desde `items` de ventas:

```json
[
  {
    "_id": "productoId",
    "cantidadVendida": 50,
    "totalVendido": 6000,
    "ganancia": 2100
  }
]
```

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `limit=1..100`

#### `GET /api/reportes/variantes-top`
Top variantes mas vendidas.

Respuesta `200`:

```json
[
  {
    "_id": {
      "variantId": "67ee00000000000000000001",
      "color": "Negro",
      "talla": "M",
      "productoId": "productoId"
    },
    "nombre": "Polera",
    "modelo": "Classic",
    "sku": "POL-CLA",
    "cantidadVendida": 50,
    "totalVendido": 6000,
    "ganancia": 2100
  }
]
```

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `limit=1..100`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/canales`
Ventas agregadas por canal (`WEB`, `APP_QR`, `TIENDA`).

Respuesta `200`:

```json
[
  {
    "_id": "APP_QR",
    "totalVentas": 2400,
    "gananciaTotal": 780,
    "cantidadVentas": 15
  }
]
```

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/vendedores`
Ventas agregadas por vendedor.

Respuesta `200`:

```json
[
  {
    "_id": "sellerId",
    "totalVentas": 2400,
    "gananciaTotal": 780,
    "cantidadVentas": 15,
    "vendedor": {
      "_id": "sellerId",
      "fullname": "Vendedor Demo",
      "email": "vendedor@correo.com"
    }
  }
]
```

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/cancelaciones`
Resumen de cancelaciones, fallos y reembolsos.

Respuesta `200`:

```json
{
  "pedidosCancelados": 3,
  "pedidosRefunded": 1,
  "pedidosFailed": 2,
  "transaccionesPorEstado": [
    {
      "_id": "REFUNDED",
      "cantidad": 1,
      "monto": 120
    }
  ],
  "cancelacionesPorCanal": [
    {
      "_id": "WEB",
      "cantidad": 2
    }
  ]
}
```

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`

#### `GET /api/reportes/inventario-rotacion`
Rotacion de inventario por variante, basada en movimientos `SALIDA` y `DEVOLUCION`.

Respuesta `200`:

```json
[
  {
    "_id": {
      "productoId": "productoId",
      "variantId": "67ee00000000000000000001",
      "color": "Negro",
      "talla": "M"
    },
    "nombre": "Polera",
    "modelo": "Classic",
    "sku": "POL-CLA",
    "salidas": 20,
    "devoluciones": 2,
    "movimientos": 8,
    "rotacionNeta": 18
  }
]
```

Query params opcionales:
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `limit=1..100`

Respuestas:
- `200`
- `400`: filtros invalidos.
- `500`
