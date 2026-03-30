# Documentacion API - Control Ventas

Base URL en desarrollo: `/api`

## Autenticacion y autorizacion

- La API usa NextAuth (JWT en cookie httpOnly).
- Middleware protege rutas y agrega headers internos:
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

### Productos (ADMIN y VENDEDOR para lectura, solo ADMIN para escritura)

#### `GET /api/productos`
Lista todos los productos.

Notas:
- Cada variante puede incluir `imagenes[]`.
- Por compatibilidad pueden existir registros antiguos con `imagen`, pero el backend migra ese valor a `imagenes[]` al guardar.
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
