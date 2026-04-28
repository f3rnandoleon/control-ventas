# Control Ventas

Aplicacion de comercio y operacion para catalogo, carrito, pedidos, pagos, entregas, POS, reportes y administracion.

## Stack

- Next.js App Router
- TypeScript
- MongoDB + Mongoose
- NextAuth
- Zod
- Cloudinary

## Dominios principales

- Catalogo y productos
- Inventario
- Clientes y direcciones
- Carrito
- Pedidos
- Pagos
- Entregas
- POS
- Reportes
- Auditoria y operaciones

## Documentacion

- API de integracion: [api_documentacion.md](./api_documentacion.md)
- Plan de refactor estructural: [implementation_plan2.md](./implementation_plan2.md)

## Desarrollo local

```bash
npm install
npm run dev
```

App local:

- `http://localhost:3000`

## Scripts utiles

```bash
npm run dev
npm run build
npm run backup
npm run restore <archivo>
npm run migrar:pedido
```

## Notas operativas

- La API soporta sesion web con NextAuth y consumo via Bearer token.
- El middleware aplica rate limiting y control de roles.
- La migracion legacy hacia `Pedido` ya esta incorporada en `scripts/migrar-a-pedido.js`.
