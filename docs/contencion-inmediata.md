# Contencion inmediata

Estado: activo durante la estabilizacion de la Parte I.

## Congelamiento operativo

- No desplegar cambios de catalogo, pagos, pedidos, entregas o estados sin regresion manual documentada y verificacion de lint/tipos/build.
- No ejecutar la verificacion E2E del core en produccion.
- No aceptar `cleanup=false` para la verificacion E2E en ninguna base operativa.
- Tomar y verificar un backup antes de cualquier migracion o cambio de datos.

## Cron de reservas

Vercel debe invocar:

```http
GET /api/admin/cron/reservas-expiradas
Authorization: Bearer <CRON_SECRET>
```

La ruta falla con `401` si `CRON_SECRET` no existe o si el header no coincide exactamente.

## Metricas base

Capturar antes de migraciones o despliegues:

- pedidos por `estadoPedido`, `estadoPago`, `estadoEntrega` y `estadoReservaStock`;
- pagos por `estado`;
- reservas vencidas restantes;
- productos con `stockReservado` mayor al stock fisico disponible;
- resultado del ultimo cron: `releasedCount`, `failedCount`, `remainingExpiredCount` y `durationMs`.

## Pagos QR

- El cliente puede subir comprobante, pero la respuesta no incluye token ni enlace de revision.
- El enlace de revision solo localiza el comprobante.
- Confirmar o rechazar requiere sesion `ADMIN` o `VENDEDOR`.
- Los tokens nuevos se guardan solo como SHA-256, con proposito, expiracion y datos de consumo.
- Los tokens antiguos en texto claro quedan invalidados porque ya no se consultan para revision.
