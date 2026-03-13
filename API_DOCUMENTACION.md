# Documentacion API - Control Ventas

Base URL en desarrollo: `/api`

## Autenticacion y autorizacion

- La API usa NextAuth (JWT en cookie httpOnly).
- Middleware protege rutas y agrega headers internos:
  - `x-user-id`
  - `x-user-role`
- Rutas publicas:
  - `POST /api/auth/signup`
  - `GET|POST /api/auth/[...nextauth]`
  - `GET /api/productos/publicos`
  - `GET /api/productos/publicos/:id`
- Rutas protegidas:
  - `ADMIN` o `VENDEDOR`: `/api/productos/**`, `/api/ventas/**`, `/api/inventario/**`
  - `CLIENTE`: `POST /api/ventas` (solo `tipoVenta: WEB`), `/api/mis-pedidos/**`
  - Solo `ADMIN`: `/api/reportes/**`, `/api/usuarios/**`, `/api/uploads/**`

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

### Uploads (solo ADMIN)

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

Respuestas:
- `201`: usuario creado.
- `400`: campos invalidos.
- `409`: email ya registrado.
- `500`: error interno.

#### `GET|POST /api/auth/[...nextauth]`
Ruta interna de NextAuth para login/sesion (`credentials`: email + password).

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

### Productos (ADMIN y VENDEDOR para lectura, solo ADMIN para escritura)

#### `GET /api/productos`
Lista todos los productos.

Respuestas:
- `200`
- `500`

#### `POST /api/productos` (solo ADMIN)
Crea producto y genera SKU.

Notas:
- Las imagenes de variantes se guardan como URL en `variantes[].imagen`.
- El flujo recomendado es subir primero el archivo a `POST /api/uploads/variantes` y luego enviar esa URL al crear el producto.
- Si por compatibilidad llega una imagen en formato base64 (`data:image/...`), el backend la sube a Cloudinary y guarda solo la URL resultante.

Body:

```json
{
  "nombre": "Polera",
  "modelo": "Classic",
  "precioVenta": 120,
  "precioCosto": 80,
  "variantes": [
    {
      "color": "Negro",
      "talla": "M",
      "stock": 10,
      "imagen": "https://res.cloudinary.com/.../image/upload/v1234567890/control-ventas/variantes/polera-negra-m.jpg"
    }
  ]
}
```

Validaciones:
- `nombre`: 3..100
- `modelo`: 2..50
- `precioVenta`: numero positivo
- `precioCosto`: numero positivo
- `precioVenta > precioCosto`
- `variantes[]` opcional (default `[]`)
- Variante:
  - `color`: requerido, max 50
  - `talla`: requerido, max 20
  - `stock`: entero >= 0
  - `imagen?`: URL valida de Cloudinary o `data:image/...` valida para migracion/compatibilidad
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
  - Si `imagen` llega como base64, la sube a Cloudinary y guarda solo la URL.
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
    "color": "Negro",
    "talla": "M",
    "stock": 5,
    "imagen": "url-opcional",
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
  "color": "Negro",
  "talla": "M",
  "tipo": "ENTRADA",
  "cantidad": 5,
  "motivo": "Reposicion"
}
```

Validaciones:
- `productoId`: ObjectId valido
- `color`: requerido, max 50
- `talla`: requerido, max 20
- `tipo`: `ENTRADA | SALIDA | AJUSTE | DEVOLUCION`
- `cantidad`: entero, distinto de 0
- `motivo?`: max 200
- `referencia?`: max 100

Reglas:
- `ENTRADA`: suma stock.
- `SALIDA`: resta stock (si no alcanza, `400`).
- `AJUSTE`: fija stock al valor absoluto de `cantidad`.

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
      "color": "Negro",
      "talla": "M",
      "cantidad": 2
    }
  ],
  "metodoPago": "EFECTIVO",
  "tipoVenta": "TIENDA",
  "descuento": 0
}
```

Validaciones:
- `items`: minimo 1
- item:
  - `productoId`: ObjectId valido
  - `color`: requerido, max 50
  - `talla`: requerido, max 20
  - `cantidad`: entero positivo, max 1000
- `metodoPago`: `EFECTIVO | QR`
- `tipoVenta`: `WEB | APP_QR | TIENDA`
- `descuento?`: numero >= 0 y <= 100

Comportamiento:
- Valida existencia de producto y variante.
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

Regla de rol `CLIENTE`:
- Puede usar `POST /api/ventas` solo cuando `tipoVenta` es `WEB`.

Respuestas:
- `201`
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

### Mis pedidos (solo CLIENTE)

#### `GET /api/mis-pedidos`
Lista las ventas del cliente autenticado (`venta.cliente = userId`), ordenadas por fecha descendente.

Notas:
- No expone `gananciaTotal`.
- No expone `items[].precioCosto` ni `items[].ganancia`.

Respuestas:
- `200`
- `403`: no autorizado.
- `500`

#### `GET /api/mis-pedidos/:id`
Detalle de un pedido propio del cliente autenticado.

Notas:
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
  "cantidadVentas": 0
}
```

Si no hay datos, devuelve esos valores en cero.

Respuestas:
- `200`
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
- `500`
