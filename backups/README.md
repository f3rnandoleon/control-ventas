# Backups

Directorio reservado para respaldos manuales/locales del sistema central.

Configuracion actual:

- `BACKUP_ENABLED=true`
- `BACKUP_PROVIDER=manual-local`
- `BACKUP_TARGET=e:\proyectos\control-ropa\control-ventas\backups`
- `BACKUP_RETENTION_DAYS=7`
- `BACKUP_MAX_AGE_HOURS=24`

Uso recomendado:

1. guardar aqui tus dumps o exportaciones
2. despues de cada respaldo, actualizar `LAST_BACKUP_AT` en `.env.local`
3. revisar `GET /api/admin/ops/overview` para confirmar que no haya `BACKUP_STALE`

Nota:

Este repo ahora queda configurado para reportar un backup local/manual. La automatizacion del dump sigue dependiendo de tu herramienta externa o job programado.
