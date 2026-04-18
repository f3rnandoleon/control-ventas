# Backups Automáticos (Scripts)

Directorio reservado para los respaldos del sistema central generados y restaurados mediante **MongoDB Database Tools** (`mongodump` y `mongorestore`).

### Configuración requerida:

Para que el sistema de alertas del proyecto esté feliz, la configuración en `.env.local` debe existir:

- `BACKUP_ENABLED=true`
- `BACKUP_PROVIDER=manual-local`
- `BACKUP_TARGET=e:\proyectos\control-ropa\control-ventas\backups`
- `BACKUP_RETENTION_DAYS=7`
- `BACKUP_MAX_AGE_HOURS=24`
- `LAST_BACKUP_AT=` (¡El script actualizará esto solo!)

---

## 💾 Crear un Backup

Para guardar tu base de datos actual y actualizar el timer de alertas automáticamente, solo corre en tu terminal:

```bash
npm run backup
```
*Esto generará un archivo `dump_FECHA.archive` en esta carpeta, y registrará en la configuración de la app que el backup está fresco.*

## 🔙 Restaurar la Base de Datos

Si cometiste un error crítico o borraste clientes/productos por accidente, puedes buscar en esta carpeta el nombre del archivo `.archive` que quieras recuperar y correr:

```bash
npm run restore nombre_del_archivo.archive
```
*Ejemplo: `npm run restore dump_2026-04-18_10-00-00.archive`*

> **ATENCIÓN:** El comando de restore elimina e ignora por completo la información que se halle actualmente en el servidor para forzar que sea reemplazada con la información exacta del backup elegido.
