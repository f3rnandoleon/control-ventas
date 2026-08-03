# Plan maestro de implementación — Control Ventas

> Estado del documento: propuesta de ejecución basada en la auditoría técnica del 30 de julio de 2026.
>
> Este plan estabiliza y mejora lo que ya existe sin ampliar el producto, sentando las bases técnicas para una operación confiable.

## 1. Propósito

Este documento transforma el diagnóstico técnico en un backlog ejecutable. Define:

- orden de implementación;
- dependencias entre trabajos;
- entregables técnicos y funcionales;
- criterios de aceptación verificables;
- pruebas obligatorias;
- estrategia de migración y despliegue;
- riesgos y condiciones de salida.

Agregar funciones sobre el núcleo actual sin antes estabilizarlo aumentaría el costo de corrección y amplificaría riesgos de dinero, stock y datos personales.

## 2. Supuestos y límites del plan

### 2.1 Supuestos

- El sistema seguirá siendo inicialmente una aplicación Next.js con MongoDB/Mongoose.
- MongoDB de producción debe operar como replica set o clúster sharded para soportar transacciones.
- La primera meta comercial es una operación minorista en una o varias sucursales, con ventas POS y comercio web.
- La moneda, reglas fiscales, emisión de facturas y proveedor de pago se decidirán formalmente antes de implementar sus integraciones.
- Todo cambio de datos se realizará mediante migraciones versionadas, repetibles y auditables.

### 2.2 Qué significa “sin aumentar funcionalidad” en la Parte I

Sí está permitido:

- corregir vulnerabilidades y defectos;
- cerrar endpoints inseguros;
- hacer consistente un comportamiento ya declarado;
- agregar pruebas, telemetría, CI/CD, índices, migraciones y documentación;
- mejorar rendimiento, accesibilidad y confiabilidad de pantallas existentes;
- eliminar respuestas, campos o rutas sin uso que sean inseguros o engañosos;
- refactorizar sin alterar el resultado funcional esperado.

No está permitido:

- crear nuevos módulos comerciales;
- incorporar nuevos medios de pago;
- crear nuevas pantallas de cliente;
- agregar compras, proveedores, almacenes o caja;
- introducir promociones, facturación o funciones no disponibles hoy.

### 2.3 Convenciones

| Convención | Significado |
|---|---|
| `CAL-xxx` | Trabajo de calidad, seguridad o estabilización de la Parte I |
| P0 | Bloqueante; riesgo inmediato de dinero, stock, acceso o pérdida de datos |
| P1 | Alto; debe resolverse antes de producción |
| P2 | Medio; necesario para una operación sostenible |
| P3 | Evolutivo; aporta escala o eficiencia, pero no bloquea el primer lanzamiento |

## 3. Línea base verificada

### 3.1 Fortalezas que se deben conservar

- TypeScript está configurado en modo estricto.
- ESLint, comprobación de tipos y build de producción finalizan correctamente.
- Existe una separación inicial por dominios: catálogo, inventario, carrito, pedidos, pagos, fulfillment, POS, reportes, auditoría y operaciones.
- Se usan esquemas Zod en una parte importante de la API.
- Los flujos principales ya intentan usar transacciones MongoDB.
- Pedidos y movimientos conservan snapshots útiles para historial.
- Existen índices iniciales, auditoría básica, health check y control de roles.
- El stock distingue físico, reservado y disponible.

### 3.2 Hallazgos que amplían el diagnóstico original

Además de los problemas ya identificados, el plan incluye los siguientes:

1. El endpoint público de revisión de comprobantes devuelve el pedido completo. Puede exponer cliente, correo, costo, ganancia y otra información interna a cualquiera que posea o filtre el enlace.
2. Los tokens de revisión se guardan en texto claro, no expiran y no contienen propósito ni versión.
3. La confirmación pública por token intenta auditar con un actor que no es un ObjectId válido; la función de auditoría absorbe el fallo y puede dejar la operación sin trazabilidad.
4. No existe protección del último administrador activo. Un administrador puede desactivarse o degradarse y dejar el sistema sin administración.
5. Las sesiones NextAuth confían en rol y estado capturados en el JWT hasta 24 horas; desactivar o degradar una cuenta no revoca el acceso inmediatamente.
6. El endpoint de perfil permite cambiar el correo sin reautenticación ni verificación posterior.
7. El API emite un `refreshToken`, pero no existe renovación. Ambos tokens comparten secreto y no declaran claramente tipo, emisor o audiencia.
8. La validación de archivos confía principalmente en el MIME declarado por el cliente; falta validar firma real, formatos permitidos y procesamiento seguro.
9. El health check público revela topología y nombre de base de datos.
10. La verificación E2E administrativa crea datos reales en la base activa y permite omitir limpieza. Debe quedar fuera de producción o aislarse estrictamente.
11. El precio y las ganancias usan `Number`; no existe política central de redondeo monetario.
12. Los descuentos POS pueden superar el subtotal y la ganancia reportada no descuenta el descuento aplicado.
13. La API acepta `DEVOLUCION` como movimiento manual, pero el servicio la rechaza.
14. La actualización de entrega realizada por el cliente no valida en runtime el objeto `entrega` antes de pasarlo al servicio.
15. La eliminación física de productos puede dejar referencias históricas rotas y eliminar imágenes usadas en snapshots.
16. Varias listas no tienen paginación: catálogo, inventario, usuarios, ventas sin parámetros y pedidos del cliente.
17. Las APIs de reportes existentes no se usan en la pantalla; el navegador descarga ventas y calcula indicadores localmente.
18. Toda la aplicación se oculta con `ClientOnly` hasta la hidratación, anulando parte del valor del renderizado del servidor.
19. El rate limiting en memoria no es global entre instancias y confía en `x-forwarded-for` sin una estrategia canónica de IP.
20. No existe validación central y temprana de variables de entorno ni archivo `.env.example` seguro.
21. Backups, retención y estado de respaldo dependen de scripts/locales y variables estáticas; no constituyen una política operativa verificable.
22. El cron de liberación de reservas es incompatible con Vercel: implementa `POST`/`x-cron-secret`, mientras la plataforma invoca `GET` con `Authorization: Bearer ...`.
23. El cron se programa una vez al día aunque existen reservas de 30 minutos.
24. No hay pruebas automatizadas ni pipeline CI.
25. La auditoría de dependencias reporta 11 vulnerabilidades de producción: 2 críticas, 5 altas y 4 moderadas.
26. Una venta POS se persiste como pagada, pero no crea una `TransaccionPago`; por ello no puede conciliarse de forma uniforme con pagos, caja o reportes.
27. Los movimientos de inventario de una venta directa usan la referencia genérica `VENTA_DIRECTA`, no el ID/número de la venta que los originó.
28. El contrato POS acepta datos de entrega y los usa para inferir el canal, pero luego los descarta; la venta queda siempre con entrega `NOT_APPLICABLE`.
29. El endpoint de escaneo POS existe, pero la interfaz actual no lo consume; la capacidad declarada de escaneo no está integrada extremo a extremo.
30. `direccionId` se transforma en un snapshot con método `PICKUP_POINT`, aunque semánticamente una dirección guardada no es necesariamente un punto de recojo.
31. `programadoPara` se maneja como texto libre, sin fecha, zona horaria, capacidad o validación contra horarios configurados.
32. La edición de catálogo puede modificar o eliminar variantes y cambiar `stock` directamente, evitando reglas, transacciones y parte del kardex de inventario.
33. La reducción de stock mediante edición no siempre registra movimiento y el stock inicial de un producto tampoco queda representado en el kardex.
34. `stockTotal` depende de un hook `pre("save")`, pero varias actualizaciones usan `findByIdAndUpdate`; el total puede quedar obsoleto.
35. El SKU se declara inmutable, mientras el servicio intenta regenerarlo al cambiar nombre/modelo; producto y códigos de variante pueden divergir.
36. No hay índices únicos explícitos para `variantes.codigoBarra` y `variantes.qrCode`; un código duplicado puede producir escaneo ambiguo.
37. `Pedido` y `Entrega` actúan como dos fuentes de verdad y no se sincronizan en cancelación de cliente, expiración, edición de entrega, confirmación en efectivo y algunos flujos por token.
38. El resumen POS no usa la definición común de venta reconocida y `totalVendidos` no se compensa en reembolsos; los indicadores pueden incluir ventas canceladas o devueltas.
39. Los reportes no fijan de forma consistente `America/La_Paz`; un KPI mensual del dashboard compara mes sin año y puede mezclar periodos de distintos años.
40. Existen diferencias de validación entre Zod y Mongoose; además, varios `findByIdAndUpdate` no ejecutan validadores y JSON malformado puede acabar como `500`.
41. Los scripts de backup/restore construyen comandos interpolados; restore no valida de forma canónica que el archivo permanezca en `backups` y ejecuta `--drop` sin preflight suficiente.
42. Las migraciones no tienen ledger de versión/checksum/lock y la migración de opciones de entrega altera configuración DNS global con servidores públicos por defecto.
43. Al subir un comprobante, la API devuelve al propio cliente el `verifyLink` con autoridad para aprobar o rechazar; es un segundo camino de autoaprobación aunque se cierre `/api/pagos/:id/confirm`.
44. La búsqueda por idempotency key ocurre antes de comprobar propiedad del pedido; reutilizar una clave global puede devolver a otro actor una transacción ajena.
45. Crear/confirmar pago no compara siempre la expiración efectiva de la reserva ni exige que el método coincida con el pedido; subir comprobante puede extender una reserva ya vencida que el cron aún no procesó.
46. Una cuenta local con correo no verificado se vincula automáticamente a Google por coincidencia de email y conserva la contraseña local; el prerregistro o cambio de correo puede producir toma/compartición de cuenta.
47. Cualquier vendedor puede ejecutar reembolsos y el reembolso financiero repone stock automáticamente aunque la mercancía no haya regresado físicamente.
48. `callbackUrl` de login llega desde query string a `router.push` sin allowlist de rutas internas.

## 4. Principios no negociables

1. El cliente nunca confirma que pagó; lo confirma personal autorizado o un proveedor externo mediante evidencia verificable.
2. Una operación reintentada debe producir el mismo resultado que una sola ejecución.
3. Ningún estado de pedido, pago, entrega o inventario puede cambiar fuera de una transición explícita.
4. Dinero y stock deben conservar invariantes dentro de una transacción.
5. La base de datos debe reforzar las reglas críticas mediante índices y restricciones, no solo mediante `if` en TypeScript.
6. Ningún despliegue se considera válido si falla lint, tipos, tests, build, migraciones o controles de seguridad.
7. Toda mutación crítica debe registrar actor, origen, request ID, estado anterior, estado posterior y referencia.
8. Las migraciones siguen el patrón expandir–migrar–verificar–contraer y deben tener rollback o plan de compensación.
9. No se usarán datos reales para pruebas automatizadas.
10. Cada fase termina con criterios medibles; “funciona en mi máquina” no es un criterio de aceptación.

---

# PARTE I — Estabilización y mejora de calidad sin agregar funcionalidad

## 5. Objetivo y condición de salida

El objetivo es convertir el producto actual en un núcleo seguro, comprobable, mantenible y operable sin ampliar su alcance comercial.

La Parte I termina únicamente cuando:

- ningún cliente puede confirmar o fallar pagos arbitrariamente;
- un pedido no puede generar doble cobro ni doble restitución de stock;
- las reservas expiradas se liberan de forma automática y observable;
- las transiciones de estados inválidas son rechazadas;
- dinero, descuentos, ganancias y stock mantienen invariantes comprobadas;
- cuentas desactivadas o degradadas pierden acceso dentro del SLA definido;
- no existen vulnerabilidades críticas o altas conocidas sin excepción formal;
- existe una suite automatizada y CI obligatorio;
- hay backup externo, restauración probada, monitoreo y rollback documentado;
- las consultas actuales tienen límites y las pantallas existentes no dependen de cargar toda la base;
- la documentación coincide con el repositorio.

## 6. Secuencia general de la Parte I

| Fase | Nombre | Prioridad | Dependencia | Esfuerzo orientativo |
|---|---|---:|---|---:|
| I.0 | Contención inmediata | P0 | Ninguna | 2–4 días-persona |
| I.1 | Red mínima de pruebas y CI | P0 | I.0 parcial | 5–8 días-persona |
| I.2 | Integridad de pagos, pedidos y stock | P0 | I.1 | 12–20 días-persona |
| I.3 | Autenticación, autorización y superficie web | P0/P1 | I.1 | 8–14 días-persona |
| I.4 | Contratos, arquitectura y mantenibilidad | P1 | I.2–I.3 | 10–18 días-persona |
| I.5 | Rendimiento, frontend actual y accesibilidad | P1/P2 | I.4 parcial | 8–14 días-persona |
| I.6 | Observabilidad y operación | P1 | I.1 | 8–15 días-persona |
| I.7 | Documentación, hardening y liberación | P1 | Todas | 4–8 días-persona |

Los rangos son de esfuerzo, no fechas comprometidas. Con una sola persona, la Parte I representa aproximadamente 8–12 semanas; con dos desarrolladores y QA puede ejecutarse en 4–7 semanas sin saltarse controles.

## 7. Fase I.0 — Contención inmediata

### Objetivo

Eliminar las vías de fraude, corrupción o exposición más inmediatas antes de continuar el desarrollo.

### CAL-001 — Bloquear confirmación y fallo de pagos por clientes

Prioridad: P0.

Acciones:

- exigir `ADMIN` o `VENDEDOR` en confirmación y fallo manual;
- reforzar el permiso dentro del servicio, no solo en middleware;
- rechazar explícitamente actores `CLIENTE` aunque la ruta sea llamada directamente;
- revisar la matriz de acceso documentada;
- registrar intento rechazado sin datos sensibles;
- invalidar cualquier cliente móvil que dependiera de la confirmación insegura.

Criterios de aceptación:

- `CLIENTE` recibe `403` al confirmar o fallar un pago;
- un staff autorizado solo procesa pagos compatibles con el pedido;
- una llamada directa al servicio con rol cliente también falla;
- existen pruebas de ruta y de servicio para ambos casos.

### CAL-002 — Reducir exposición del enlace público de revisión

Prioridad: P0.

Acciones:

- definir una proyección segura específica para revisión;
- dejar de devolver `tokenRevision` o `verifyLink` al cliente que sube el comprobante;
- invalidar inmediatamente todos los enlaces emitidos bajo el diseño inseguro;
- exigir sesión administrativa para aprobar/rechazar; el token puede localizar el recurso, pero no debe conferir autoridad por sí solo;
- excluir `precioCosto`, `ganancia`, `gananciaTotal`, correo y referencias internas;
- no devolver el documento Mongoose completo;
- agregar `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y protección contra indexación;
- limitar intentos por IP y token;
- almacenar solo el hash del token;
- agregar `purpose`, `expiresAt`, `usedAt` y `usedBy`;
- consumir el token mediante operación atómica condicional;
- migrar o invalidar tokens antiguos;
- corregir el actor de auditoría usando actor de sistema válido o campos compatibles.

Criterios de aceptación:

- el JSON público contiene únicamente los campos aprobados;
- un token expirado, usado o desconocido devuelve respuesta uniforme;
- la base de datos no permite recuperar el token original;
- dos confirmaciones concurrentes producen una sola transición;
- cada confirmación/rechazo queda auditado.
- ningún response al cliente contiene token o enlace privilegiado y ninguna ruta indirecta permite autoaprobarse.

### CAL-003 — Corregir el cron de reservas

Prioridad: P0.

Acciones:

- implementar `GET` para la invocación programada;
- validar exactamente `Authorization: Bearer ${CRON_SECRET}`;
- fallar cerrado si `CRON_SECRET` no existe;
- retirar la dependencia de `x-cron-secret` o reservarla solo para un modo local documentado;
- ejecutar el trabajo una vez por día, compatible con el plan Hobby gratuito de Vercel (frecuencia máxima permitida sin costo en Vercel Hobby);
- procesar por lotes hasta no dejar vencidos, con límite de tiempo;
- agregar lock distribuido o lease para evitar ejecuciones superpuestas;
- al expirar, resolver también pagos pendientes, tokens de revisión y fulfillment de acuerdo con la máquina de estados;
- emitir métricas de encontrados, liberados, fallidos y duración;
- crear alerta cuando queden reservas vencidas después de la ejecución.

Criterios de aceptación:

- una invocación igual a la de Vercel retorna `200` y procesa vencidos;
- una invocación sin secreto o con secreto incorrecto retorna `401`;
- dos ejecuciones simultáneas no liberan dos veces el mismo stock;
- el desfase máximo observado es ≤ 24 h, consistente con la ejecución diaria en Vercel Hobby.

### CAL-004 — Parchear dependencias vulnerables

Prioridad: P0.

Acciones:

- actualizar Next.js a la versión corregida compatible de su rama;
- actualizar NextAuth/Auth.js siguiendo guía de migración aplicable;
- actualizar Axios o eliminarlo si continúa sin uso;
- actualizar dependencias transitivas vulnerables de jsPDF/DOMPurify, PostCSS, Sharp y UUID;
- alinear versiones de `next` y `eslint-config-next`;
- regenerar lockfile de forma controlada;
- ejecutar audit, lint, tipos, build y smoke tests;
- documentar excepciones temporales con propietario y vencimiento.

Criterios de aceptación:

- cero vulnerabilidades críticas y altas conocidas sin excepción aprobada;
- el lockfile es reproducible con `npm ci`;
- build y smoke tests pasan con las versiones nuevas.

### CAL-005 — Congelar cambios peligrosos durante la estabilización

Prioridad: P0.

Acciones:

- no desplegar cambios de catálogo, pagos o estados sin prueba de regresión;
- desactivar en producción la verificación E2E que muta datos y moverla a una base efímera/aislada; no aceptar `cleanup=false` en una base operativa;
- realizar backup verificable antes de migraciones;
- capturar métricas base: pedidos por estado, pagos por estado, reservas vencidas y stock reservado inválido.

## 8. Fase I.1 — Red mínima de pruebas y CI

### CAL-010 — Estrategia de pruebas

Prioridad: P0.

Stack sugerido:

- Vitest para dominio y servicios;
- React Testing Library para componentes actuales;
- Playwright para flujos E2E;
- MongoDB temporal en modo replica set para probar transacciones;
- fixtures/factories tipadas, sin copiar dumps reales.

Capas obligatorias:

1. Unitarias: cálculos puros, esquemas, permisos y máquinas de estados.
2. Integración: servicios con MongoDB y transacciones reales.
3. Contrato HTTP: autenticación, status codes, payload y no exposición de campos.
4. Concurrencia: pagos, reservas, consumo y reembolso.
5. E2E: login, POS, pedido, confirmación, cancelación, entrega y reportes actuales.

### CAL-011 — Pruebas de caracterización

Antes de refactorizar, fijar el comportamiento válido actual:

- creación y edición de productos/variantes;
- entrada, salida y ajuste de stock;
- venta directa POS;
- checkout desde carrito;
- reserva, consumo y liberación;
- confirmación en efectivo;
- comprobante QR y revisión;
- pedido y entrega;
- filtros de ventas y reportes existentes;
- administración de usuarios y opciones de entrega.

### CAL-012 — Matriz mínima de concurrencia

Casos obligatorios:

| Caso | Resultado esperado |
|---|---|
| Dos checkouts por el último artículo | Solo uno reserva |
| Dos confirmaciones del mismo pago | Una transición; misma respuesta idempotente o conflicto controlado |
| Dos pagos activos para el mismo pedido | El segundo se rechaza o reutiliza la intención existente |
| Dos reembolsos del mismo pago | Stock se restituye una sola vez |
| Cron y confirmación simultáneos | Solo una operación válida gana; no queda stock negativo |
| Ajuste y venta simultáneos | Se conserva `stock >= stockReservado >= 0` |
| Dos cambios incompatibles de estado | Uno se rechaza por versión/transición |
| Reutilizar idempotency key de otro actor/pedido | Nunca devuelve datos ajenos; `404/409` controlado |
| Token de revisión tras otra confirmación | No puede cambiar `PAID` a `FAILED` ni cancelar el pedido |
| Editar catálogo mientras se reserva | No pierde ni sobrescribe la reserva |

### CAL-013 — Pipeline CI obligatorio

Etapas:

1. `npm ci`.
2. Validación de formato si se adopta formatter.
3. ESLint.
4. TypeScript sin emisión.
5. Tests unitarios.
6. Tests de integración.
7. Build de producción.
8. Auditoría de dependencias y secretos.
9. E2E smoke en preview o staging.

Política:

- ninguna rama se fusiona con una etapa fallida;
- proteger la rama principal;
- conservar reportes de test y cobertura;
- prohibir `.env`, dumps y comprobantes en artefactos.

Objetivos de cobertura inicial:

- dominio de pagos/pedidos/inventario: al menos 90 % de ramas críticas;
- autenticación y autorización: 90 % de casos de acceso;
- global: objetivo progresivo de 70–80 %, sin usar cobertura como sustituto de buenos casos.

## 9. Fase I.2 — Integridad de pagos, pedidos y stock

### CAL-020 — Máquina de estados central

Prioridad: P0.

Crear una única definición de:

- estados de pedido;
- estados de pago;
- estados de reserva;
- estados de entrega;
- transiciones permitidas;
- roles autorizados por transición;
- efectos laterales obligatorios;
- estados terminales.

Reglas mínimas:

- no pasar de cancelado a confirmado;
- no marcar pagado mediante el endpoint genérico de pedido;
- no entregar un pedido sin pago salvo flujo en efectivo explícito;
- no reembolsar un pago pendiente o ya reembolsado;
- solo permitir `PENDING -> FAILED` y rechazar `PAID -> FAILED`;
- no consumir reserva liberada o vencida;
- cancelar debe liberar reserva exactamente una vez;
- pago, reserva, pedido y entrega deben finalizar en una combinación coherente.
- `confirm-for-delivery` no puede convertir una reserva impaga en indefinida; debe tener transición, responsable y nueva expiración explícita o ser retirado.

Eliminar `Object.assign` como mecanismo de transición. Cada comando debe expresar intención: confirmar, preparar, marcar listo, despachar, entregar, cancelar.

### CAL-021 — Invariante de pago por pedido

Prioridad: P0.

Acciones:

- decidir formalmente si el modelo actual permite un solo pago o varios intentos;
- para el alcance actual, permitir muchos intentos históricos pero solo uno activo/efectivo;
- agregar índice parcial único para pago activo según estados definidos;
- exigir idempotency key generada por cliente o servidor en cada creación;
- buscar idempotencia después de autorizar el recurso y hacerla única por actor/pedido/operación/hash del payload;
- validar importe, método y pedido dentro de la transacción;
- rechazar creación, confirmación o extensión cuando `reservaExpiraEn <= now`, aunque el cron aún no haya corrido;
- exigir que `metodoPago` coincida con el pedido o ejecutar una transición autorizada explícita;
- generar `numeroPago` con entropía suficiente, no solo `Date.now()`;
- guardar proveedor/origen aunque inicialmente sea `MANUAL`;
- no aceptar monto enviado como autoridad del cliente;
- definir códigos de error estables para conflicto e idempotencia.

### CAL-022 — Reembolso y restitución de stock idempotentes

Prioridad: P0.

Acciones:

- registrar si y cuánto stock fue restituido por línea;
- impedir restituir más que la cantidad vendida;
- restringir temporalmente el reembolso a `ADMIN` hasta que exista permiso granular y política de aprobación;
- separar el hecho financiero “reembolsado” del hecho físico “mercancía recibida y apta para stock”;
- no incrementar stock por el solo hecho de devolver dinero;
- actualizar pago, pedido, inventario y auditoría en la misma transacción;
- usar control optimista de versión o actualización condicional;
- separar motivo de fallo de motivo de reembolso;
- garantizar que un retry devuelve el resultado existente o conflicto explícito.

### CAL-023 — Reserva y consumo de stock atómicos

Prioridad: P0.

Acciones:

- evitar depender exclusivamente de leer documento, mutar array y guardar;
- usar actualización condicional/versión con precondición de stock disponible;
- hacer que reserva, liberación y consumo validen invariantes antes y después;
- evitar `Math.max(0, reservado - cantidad)` porque puede ocultar una doble liberación;
- rechazar una liberación mayor que la reserva correspondiente;
- vincular reservas a pedido/línea mediante ledger o referencia inequívoca;
- reconciliar `stockTotal` y variantes mediante job de verificación, no como fuente independiente de verdad.

Invariantes:

```text
stockFisico >= 0
stockReservado >= 0
stockReservado <= stockFisico
stockDisponible = stockFisico - stockReservado
cantidadVendida = suma de salidas comerciales válidas
```

### CAL-024 — Dinero y redondeo

Prioridad: P1 alta.

Decisión recomendada:

- guardar importes como enteros en unidad mínima (`centavos`) mientras se maneje una moneda de dos decimales;
- si se requiere precisión/monedas variables, usar Decimal128 con adaptadores estrictos;
- nunca usar coma flotante para totales persistidos.

Acciones:

- crear tipo/objeto de valor `Money`;
- centralizar suma, resta, multiplicación, comparación y redondeo;
- migrar precios, costos, subtotal, descuentos, total, ganancia y pagos;
- verificar cada pedido histórico: `subtotal - descuento + cargos = total`;
- mantener lectura dual durante la migración;
- no retirar campos antiguos hasta completar verificación.

### CAL-025 — Corregir descuentos y ganancias

Prioridad: P0/P1.

Acciones:

- limitar descuento a `0 <= descuento <= subtotal`;
- definir si el descuento es monto o porcentaje y usar un solo significado;
- repartir descuento por línea de forma determinista para reportes y devoluciones;
- calcular ganancia neta considerando descuento asignado;
- impedir ganancia negativa si la política actual no lo permite, o representarla correctamente si sí se permite;
- recalcular indicadores solo con ventas reconocidas.

### CAL-026 — Consistencia del movimiento `DEVOLUCION`

Prioridad: P1.

Sin agregar un flujo nuevo:

- si la devolución manual no forma parte del comportamiento actual, quitarla del esquema de entrada;
- si ya se utiliza internamente, implementar de forma consistente su efecto existente y cubrirlo con pruebas;
- no mezclar este arreglo con un flujo funcional completo de devoluciones; ese trabajo queda fuera del alcance de la Parte I.

### CAL-027 — Migraciones y saneamiento de datos

Crear scripts con modos `--dry-run`, `--apply` y reporte:

- pagos duplicados por pedido;
- reservas vencidas o negativas;
- `stockReservado > stock`;
- pedidos con combinaciones de estado inválidas;
- pagos cuyo monto difiere del pedido;
- usuarios con nombres de campos de autenticación incorrectos;
- productos/variantes con códigos duplicados o ausentes;
- documentos monetarios no representables exactamente;
- entregas huérfanas;
- auditorías con actor inválido.

Ninguna corrección ambigua debe ser automática. Generar una cola de revisión manual.

### CAL-028 — Consistencia contable y logística de la venta POS actual

Prioridad: P0/P1.

Este trabajo corrige capacidades ya declaradas; no agrega caja, pago dividido ni nuevas modalidades.

Acciones:

- crear una `TransaccionPago` inmediata para cada venta POS marcada `PAID`, dentro de la misma transacción MongoDB;
- usar una idempotency key derivada de la venta y un índice que impida duplicarla;
- garantizar correspondencia `pedido.total = pago.monto`;
- generar el número/ID lógico de venta antes de consumir stock y usarlo como referencia de cada movimiento;
- reconciliar ventas POS históricas sin pago mediante migración; no inventar pagos si el origen no puede determinarse;
- hacer que el resumen POS use la definición única de venta reconocida y excluya canceladas/reembolsadas;
- corregir o reemplazar `totalVendidos` como contador derivado, incluyendo compensación verificada en reembolsos;
- decidir mediante ADR si `delivery` forma parte realmente del POS actual:
  - si sí forma parte del contrato vigente, persistir snapshot y sincronizar fulfillment;
  - si nunca estuvo disponible para el usuario, retirarlo del schema/documentación;
- impedir que una venta `TIENDA` termine con estados de entrega contradictorios;
- verificar que resumen POS, ventas, pagos e inventario arrojen la misma población.

Criterios de aceptación:

- toda nueva venta POS pagada tiene exactamente una transacción de pago conciliable;
- cada salida de stock referencia inequívocamente la venta;
- un retry del POST POS no duplica pedido, pago ni movimiento;
- el tratamiento de entrega coincide en schema, servicio, UI y documentación;
- existe reporte dry-run de ventas POS históricas no conciliables.

### CAL-029 — Cerrar vías paralelas de modificación de stock desde catálogo

Prioridad: P0.

Acciones:

- prohibir que el CRUD general de producto modifique directamente `stock` o `stockReservado` de variantes existentes;
- hacer que stock inicial, aumento, reducción, corrección y eliminación de variante pasen por casos de uso de inventario;
- registrar un movimiento por cada delta, incluido el stock inicial;
- ejecutar actualización de producto, saldo y kardex dentro de la misma transacción;
- impedir eliminar una variante con reserva, stock, movimientos o referencias históricas incompatibles;
- decidir si SKU es realmente inmutable; alinear modelo, servicio, UI y códigos derivados;
- sustituir `stockTotal` persistido por cálculo/proyección confiable o actualizarlo de forma explícita en toda mutación;
- crear índices únicos para QR y código de barras después de auditar duplicados;
- hacer que el escaneo rechace ambigüedad, nunca devuelva el primer documento arbitrario;
- mover eliminación de imágenes a una operación posterior al commit o a una outbox compensable.

Criterios de aceptación:

- ninguna ruta de catálogo cambia existencias sin movimiento de inventario;
- cada delta de stock se reconcilia exactamente con el kardex;
- un fallo de Cloudinary o MongoDB no deja producto activo sin imágenes ni datos a medio aplicar;
- no se puede crear/importar un código de variante duplicado;
- `stockTotal` coincide con la suma de variantes tras create, update, venta, devolución y migración;
- las pruebas cubren edición/eliminación concurrente de una variante reservada.

## 10. Fase I.3 — Autenticación, autorización y superficie web

### CAL-030 — Unificar estrategia de autenticación

Prioridad: P0/P1.

Acciones:

- documentar claramente sesión web NextAuth vs JWT Bearer;
- incluir `iss`, `aud`, `sub`, `jti`, `type` y expiración en tokens Bearer;
- usar secretos o claves separadas por tipo de token;
- como no existe renovación actual, dejar de emitir `refreshToken` o aprobar una ADR que lo mantenga solo como campo deprecado;
- validar algoritmo permitido explícitamente;
- no escribir errores de token con datos sensibles;
- normalizar respuestas 401/403.
- validar `callbackUrl` contra una allowlist de rutas relativas por rol; rechazar URL absoluta, protocol-relative y esquemas no HTTP internos.

### CAL-031 — Revocación y actualización de permisos

Prioridad: P0.

Acciones:

- agregar `sessionVersion` o `securityStamp` al usuario;
- incluirlo en JWT y compararlo en operaciones sensibles;
- incrementarlo al desactivar, cambiar rol, cambiar contraseña o cerrar todas las sesiones;
- consultar estado/rol vigente en base de datos para operaciones críticas;
- definir SLA de revocación inmediata o menor a cinco minutos;
- impedir que un rol capturado hace 24 horas conserve privilegios administrativos.

### CAL-032 — Invariantes administrativas

Prioridad: P0.

Acciones:

- impedir desactivar o degradar al último administrador activo;
- impedir auto-degradación accidental sin confirmación reforzada;
- auditar cambios de rol, estado, email y contraseña con antes/después;
- validar ObjectId antes de actualizar;
- manejar duplicados de email como `409`, no `500`;
- usar transacción al convertir un usuario en cliente y crear su perfil.

### CAL-033 — Credenciales y perfil

Prioridad: P1.

Acciones:

- aplicar Zod al login y signup;
- elevar política de contraseña y permitir futura evolución sin romper hashes;
- normalizar email Unicode antes de validar/consultar;
- exigir contraseña actual o reautenticación para cambiar email/contraseña;
- marcar email como no verificado después de cambiarlo;
- no vincular Google automáticamente a una cuenta local cuyo correo no fue verificado;
- exigir una ceremonia explícita de vinculación con reautenticación del método existente;
- resolver de forma segura cuentas ya vinculadas bajo la regla anterior;
- corregir `authProviders`/`proveedoresAuth` y `emailVerified`/`emailVerificado`;
- evitar enumeración de cuentas en mensajes y tiempos;
- mantener bcrypt con costo revisado mediante benchmark.

### CAL-034 — Rate limiting distribuido

Prioridad: P1.

Acciones:

- reemplazar el `Map` en memoria por Redis/Upstash u otro store compartido;
- resolver IP desde headers confiables del proveedor;
- separar límites de login, signup, token público, uploads, lecturas y mutaciones;
- combinar IP, usuario y recurso en acciones críticas;
- devolver `Retry-After` real;
- medir bloqueos y falsos positivos.

### CAL-035 — Headers y políticas del navegador

Prioridad: P1.

Configurar y probar:

- Content-Security-Policy;
- Strict-Transport-Security;
- `frame-ancestors`/protección contra framing;
- Referrer-Policy;
- Permissions-Policy;
- `X-Content-Type-Options: nosniff`;
- cookies `Secure`, `HttpOnly` y SameSite adecuadas;
- política CORS explícita si se mantiene API móvil.

### CAL-036 — Uploads seguros

Prioridad: P1.

Acciones:

- permitir solo JPEG, PNG y WebP salvo necesidad documentada;
- validar magic bytes y decodificar la imagen;
- rechazar SVG y formatos activos;
- imponer dimensiones y tamaño después de descompresión;
- generar nombre servidor y eliminar metadata sensible;
- separar comprobantes de imágenes públicas de catálogo;
- aplicar acceso privado o URL firmada a comprobantes;
- limpiar uploads huérfanos mediante proceso controlado.

### CAL-037 — Secretos y configuración

Prioridad: P1.

Acciones:

- crear módulo de configuración validado con Zod al arrancar;
- crear `.env.example` sin secretos;
- clasificar variables públicas/privadas;
- eliminar fallbacks de URL de producción codificados;
- documentar rotación de JWT, NextAuth, Google, Cloudinary, Telegram, cron y MongoDB;
- incorporar escaneo de secretos en CI;
- verificar que backups y logs no contengan credenciales.

## 11. Fase I.4 — Contratos, arquitectura y mantenibilidad

### CAL-040 — Fuente única de contratos

Prioridad: P1.

Acciones:

- centralizar enums y objetos de valor de dominio;
- derivar tipos TypeScript desde Zod donde sea posible;
- mapear explícitamente documentos de persistencia a DTOs;
- no devolver documentos Mongoose directamente;
- separar DTO público, DTO staff y DTO interno;
- agregar validación de salida para endpoints críticos durante desarrollo/tests.
- alinear longitudes, opcionalidad y enums entre Zod y Mongoose;
- habilitar `runValidators` en actualizaciones o evitar updates que omitan reglas del agregado;
- devolver `400` bien formado para JSON inválido, no propagarlo como `500`;
- al actualizar un solo precio, validar también contra el valor opuesto persistido;
- reemplazar payloads `Record<string, unknown>` por tipos de repositorio explícitos.

### CAL-041 — Límites de módulos

Prioridad: P1.

Regla objetivo:

```text
route -> application service -> repository -> model/database
                     -> domain rules
```

Acciones:

- impedir que rutas de usuarios/auth/perfil accedan directamente a modelos;
- mover acceso Mongoose fuera de servicios de aplicación cuando sea práctico;
- evitar dependencias circulares entre pedidos, pagos, inventario y fulfillment mediante comandos/orquestador;
- documentar qué módulo es dueño de cada estado y colección;
- agregar reglas ESLint de importación por capas.

### CAL-042 — Dividir servicios grandes

Prioridad: P1/P2.

Separar, como mínimo:

- creación de pedido;
- transición de pedido;
- reserva y expiración;
- creación/confirmación/fallo/reembolso de pago;
- revisión de comprobante;
- movimientos y ajustes de inventario;
- consultas/reportes.

Cada unidad debe tener una responsabilidad y pruebas propias. No crear abstracciones genéricas sin una necesidad concreta.

### CAL-043 — Errores y respuestas HTTP uniformes

Prioridad: P1.

Formato recomendado:

```json
{
  "error": {
    "code": "PAYMENT_ALREADY_PROCESSED",
    "message": "El pago ya fue procesado",
    "details": [],
    "requestId": "..."
  }
}
```

Acciones:

- mapear errores Mongoose/Zod/duplicados/transacciones;
- no filtrar stack ni nombres internos;
- devolver request ID también en errores;
- diferenciar 400, 401, 403, 404, 409, 410, 422, 429 y 503;
- actualizar clientes actuales y documentación.

### CAL-044 — Limpieza y consistencia

Prioridad: P2.

- corregir mojibake/codificación en código y mensajes;
- adoptar UTF-8 y EditorConfig;
- retirar comentarios duplicados y obsoletos;
- eliminar Axios si no se utiliza;
- identificar rutas, servicios, esquemas y tipos legacy;
- actualizar nombres en español/inglés de forma consistente sin migración masiva innecesaria;
- evitar `any` y casts estructurales inseguros;
- añadir formatter si el equipo lo acuerda.

### CAL-045 — Borrado lógico y referencias históricas

Prioridad: P1.

Sin agregar nueva funcionalidad visible:

- sustituir borrado físico de productos usados por `INACTIVO/archivedAt`;
- bloquear borrado si existen referencias o movimientos;
- conservar imágenes requeridas por snapshots históricos;
- definir retención de activos Cloudinary;
- reconciliar productos ya eliminados mediante snapshots.

### CAL-046 — Fuente de verdad de entrega y sincronización con pedido

Prioridad: P0/P1.

Acciones:

- declarar si `Pedido` conserva solo un snapshot comercial y `Entrega` es la fuente operativa, o si ambos se proyectan desde eventos; no permitir dos autoridades mutables;
- centralizar cancelación, edición, preparación, despacho y entrega en casos de uso que actualicen toda proyección requerida;
- sincronizar cancelación por cliente, expiración de reserva, confirmación de efectivo y edición de datos de entrega;
- impedir retrocesos/saltos arbitrarios como `DELIVERED -> PENDING`;
- corregir confirmación por token para conservar `NOT_APPLICABLE` cuando corresponde;
- pasar actor a cada transición y auditar antes/después;
- separar canal comercial (`WEB`, `WHATSAPP`, etc.) de método logístico (`PICKUP`, `SHIPPING`, etc.);
- no convertir una dirección guardada automáticamente en punto de recojo;
- mientras no existan slots reales, validar `programadoPara` como fecha/hora estructurada o retirar el campo libre del contrato actual.

Criterios de aceptación:

- auditor de datos no encuentra divergencias Pedido–Entrega;
- cada transición válida produce estados coherentes y cada inválida retorna `409`;
- ninguna transición crítica carece de actor/auditoría;
- schema, UI, API y persistencia usan la misma semántica de canal y entrega.

## 12. Fase I.5 — Rendimiento, frontend actual y accesibilidad

### CAL-050 — Eliminar el bloqueo global `ClientOnly`

Prioridad: P1.

Acciones:

- mantener providers cliente en el límite mínimo necesario;
- renderizar contenido y layouts en servidor cuando corresponda;
- resolver hidratación de tema con script/clase segura;
- medir LCP, CLS, INP y tiempo de hidratación antes/después;
- conservar funcionalidad de sesión y tema.

### CAL-051 — Paginación y límites

Prioridad: P1.

Agregar paginación a las capacidades existentes:

- productos internos y públicos;
- usuarios;
- inventario y movimientos;
- pedidos generales y del cliente;
- ventas;
- auditoría;
- opciones de búsqueda de gran volumen.

Reglas:

- límite máximo en servidor aunque el cliente no lo envíe;
- orden estable con `_id` como desempate;
- para alto volumen, migrar de `skip` a cursor;
- devolver `items`, cursor/página y total cuando sea razonable.

### CAL-052 — Reportes existentes en servidor

Prioridad: P1.

Acciones:

- hacer que la pantalla use los endpoints de reportes existentes;
- unificar definición de “venta reconocida”;
- filtrar en MongoDB, no en el navegador;
- definir zona horaria de negocio de forma central;
- fijar explícitamente `America/La_Paz` en parseo y agregaciones mientras sea la zona configurada;
- usar rango `[desde, hastaExclusivo)`;
- validar totales contra pedidos/pagos;
- impedir que vendedor vea costos/ganancias si no corresponde.
- corregir comparaciones mensuales para incluir año y agregar regresiones de cambio de año/mes/DST del runtime;

### CAL-053 — Índices y consultas

Prioridad: P1/P2.

Acciones:

- capturar `explain("executionStats")` de consultas críticas;
- diseñar índices compuestos para filtros reales;
- revisar búsquedas regex no ancladas;
- agregar proyecciones y `.lean()` en lecturas;
- evitar `populate` innecesario;
- establecer presupuestos de latencia y tamaño de payload;
- medir con datos representativos, no solo base vacía.

SLO inicial sugerido:

- lecturas operativas p95 < 500 ms;
- mutaciones críticas p95 < 1 s sin contar proveedor externo;
- payload habitual < 250 KB;
- ninguna consulta interactiva sin límite.

### CAL-054 — Bundle y carga

Prioridad: P2.

- cargar jsPDF, generadores PDF y gráficos bajo demanda;
- revisar el bundle de productos, actualmente el más pesado;
- evitar importar librerías de cliente en rutas servidor;
- optimizar imágenes y placeholders;
- usar AbortController en búsquedas/filtros;
- eliminar waterfalls de fetch donde puedan resolverse en servidor.

### CAL-055 — Accesibilidad y UX de pantallas existentes

Prioridad: P2.

Sin crear pantallas nuevas:

- asociar labels a inputs;
- agregar nombres accesibles a botones de icono;
- gestionar foco y Escape en modales;
- asegurar navegación por teclado;
- estados de carga, vacío, error y reintento consistentes;
- confirmar acciones destructivas;
- contraste AA y no depender solo del color;
- tablas responsivas con encabezados correctos;
- pruebas con axe y recorrido manual.

## 13. Fase I.6 — Observabilidad y operación

### CAL-060 — Logging estructurado extremo a extremo

Prioridad: P1.

Campos mínimos:

- timestamp;
- level;
- request ID/trace ID;
- ruta y método;
- actor pseudonimizado;
- acción y entidad;
- duración;
- resultado/código;
- error serializado sin secretos.

El request ID debe generarse una vez, propagarse a servicios/auditoría y devolverse en toda respuesta.

### CAL-061 — Métricas y alertas

Prioridad: P1.

Métricas:

- tasa de 4xx/5xx;
- latencia por endpoint;
- logins fallidos y rate limits;
- pagos pendientes/fallidos/reembolsados;
- reservas vencidas;
- inconsistencias de stock;
- jobs ejecutados/fallidos;

Alertas P0:

- cron sin éxito dentro de dos intervalos;
- reserva vencida por encima del umbral;
- stock reservado mayor al físico;
- spike de confirmaciones/reembolsos;
- base sin soporte de transacciones;
- errores 5xx sostenidos.

### CAL-062 — Health checks seguros

Prioridad: P1.

- endpoint público: solo `ok/degraded`, timestamp y versión;
- detalle de topología, base y métricas: solo admin/monitor autenticado;
- readiness separado de liveness;
- no considerar listo al sistema sin transacciones, configuración o migraciones requeridas.

### CAL-064 — Migraciones y despliegue

Prioridad: P1.

- colección de versión de esquema;
- migraciones idempotentes y con lock;
- dry-run con conteos y muestras anonimizadas;
- compatibilidad entre versión anterior/nueva durante despliegue;
- feature flags para cambios riesgosos;
- estrategia canary o staging;
- rollback de aplicación separado de compensación de datos;
- no ejecutar migraciones destructivas automáticamente al arrancar.
- almacenar versión, checksum, inicio/fin, resultado y responsable de cada migración;
- usar lock para impedir dos ejecuciones simultáneas;
- administrar índices mediante migraciones controladas, no depender de auto-indexado implícito;
- eliminar cambios DNS globales de scripts o hacerlos opt-in, locales y documentados;
- retirar parámetros muertos de la verificación E2E y moverla completamente a staging/test.

### CAL-065 — Auditoría confiable

Prioridad: P1.

- registrar before/after de cambios críticos;
- no hacer “safe ignore” de auditoría en operaciones donde sea requisito;
- separar fallo de auditoría no crítica de auditoría obligatoria;
- usar actor de sistema representable;
- restringir modificación/borrado de eventos;
- definir retención e índices;
- ocultar secretos, tokens, contraseñas y comprobantes del metadata.

### CAL-066 — Runbooks operativos

Crear procedimientos para:

- pago confirmado sin pedido coherente;
- reserva atascada;
- stock negativo o reservado inválido;
- cron fallido;
- proveedor externo caído;
- rotación de secreto;
- rollback de despliegue;
- usuario administrador bloqueado;
- incidente de exposición de comprobantes.

## 14. Fase I.7 — Documentación, hardening y liberación

### CAL-070 — Documentación sincronizada

Acciones:

- corregir scripts inexistentes y capitalización de archivos en README;
- documentar instalación con `npm ci`;
- agregar `.env.example` y matriz de variables;
- actualizar matriz de acceso API;
- documentar errores, paginación, idempotencia y estados;
- generar OpenAPI o contrato equivalente desde fuentes verificables;
- agregar diagramas de pedido/pago/inventario;
- documentar decisiones en ADRs.

ADRs mínimos:

1. Estrategia de autenticación web/Bearer.
2. Representación monetaria.
3. Invariante de pagos por pedido.
4. Máquina de estados.
5. Reserva y ledger de inventario.
6. Estrategia de migraciones.
7. Política de backup.

### CAL-071 — Revisión de seguridad final

- threat model actualizado;
- revisión OWASP de auth, acceso, uploads y tokens;
- prueba de IDOR en todos los recursos por ID;
- prueba de mass assignment;
- prueba de abuso de rate limit;
- secret scan;
- dependency audit;
- revisión de headers/cookies;
- validación de que DTOs públicos no exponen costos ni PII.

### CAL-072 — Liberación controlada

Secuencia:

1. Congelar esquema y tomar backup.
2. Ejecutar migraciones dry-run.
3. Desplegar compatibilidad expandida.
4. Ejecutar migración por lotes.
5. Verificar invariantes y conteos.
6. Activar cambios mediante flags.
7. Smoke tests y observación reforzada.
8. Mantener ventana de rollback.
9. Contraer campos antiguos solo en una versión posterior.

## 15. Matriz de pruebas obligatorias de la Parte I

| Dominio | Casos mínimos |
|---|---|
| Auth | credenciales válidas/incorrectas, cuenta desactivada, cambio de rol, revocación, JWT malformado, Google, último admin |
| Acceso | cada endpoint por ADMIN/VENDEDOR/CLIENTE/anónimo; propiedad de recurso; Bearer vs sesión |
| Productos | SKU/códigos únicos, variante duplicada, baja lógica, imágenes seguras, actualización concurrente |
| Carrito | propiedad, stock cambiado, precio cambiado, cantidad límite, carrito vacío |
| Pedido | checkout, snapshot, descuento, todas las transiciones válidas e inválidas, cancelación idempotente |
| Pago | crear, retry, duplicado, confirmar, fallar, reembolsar, token expirado/usado, concurrencia |
| Inventario | entrada/salida/ajuste, reserva/liberación/consumo, invariantes, reconciliación |
| Entrega | propiedad, transiciones, sincronización con pedido, payload inválido |
| Reportes | zona horaria, filtros, venta reconocida, reembolso, descuento, exactitud monetaria |
| Operación | cron real, lock, readiness, alerta, migración dry-run/rollback |
| Frontend | carga/error/vacío, permisos, teclado, modal, responsive, no hydration mismatch |

## 16. Definition of Done de la Parte I

Una tarea `CAL` solo está terminada si:

- tiene código y/o configuración revisada;
- incluye pruebas de éxito, fallo y autorización;
- no reduce invariantes ni cobertura crítica;
- actualiza contrato/documentación;
- incluye migración y rollback si cambia datos;
- produce logs/métricas apropiados;
- pasa CI completo;
- fue validada en staging con datos sintéticos representativos;
- no introduce nueva funcionalidad comercial.

## 17. Entregables de la Parte I

- suite automatizada y factories;
- pipeline CI;
- endpoints y servicios de pago endurecidos;
- máquina de estados y reglas de transición;
- modelo monetario seguro;
- migraciones y reporte de saneamiento;
- autenticación revocable y autorización consistente;
- rate limit distribuido y headers seguros;
- contratos/DTOs separados;
- paginación y reportes server-side;
- observabilidad y alertas;
- cron funcional;
- documentación/ADRs/runbooks;
- informe de readiness firmado.


---

## 36. Orden recomendado de los primeros 18 trabajos

1. CAL-001: cerrar confirmación/fallo de pagos a clientes.
2. CAL-002: retirar el enlace privilegiado del response, exigir admin e invalidar tokens inseguros.
3. CAL-005: desactivar la verificación E2E sobre producción y congelar cambios peligrosos.
4. CAL-003: reparar cron, autenticación, lote y lock.
5. CAL-004: actualizar dependencias críticas.
6. CAL-010/011: instalar pruebas y caracterizar flujos.
7. CAL-012: ejecutar pruebas de concurrencia y abuso.
8. CAL-013: hacer CI obligatorio para todo trabajo posterior.
9. CAL-021: garantizar un pago activo/efectivo por pedido e idempotencia scoped.
10. CAL-022: hacer reembolso idempotente y separarlo de la recepción física.
11. CAL-023: hacer reserva/consumo/liberación atómicos.
12. CAL-029: cerrar modificaciones de stock desde catálogo.
13. CAL-020/046: implantar máquinas de estados y una fuente de verdad de entrega.
14. CAL-028: reconciliar venta POS, pago, entrega e inventario.
15. CAL-025: corregir descuentos y ganancias.
16. CAL-031/032/033: revocación, último administrador y vinculación segura de identidad.
17. CAL-034/035/036/037: rate limit, headers, uploads y secretos.
18. CAL-027: sanear/migrar datos y verificar invariantes antes de crear constraints.

## 37. Gate final antes de declarar la Parte I completa

La Parte I solo puede declararse terminada cuando:

- ningún cliente puede confirmar o fallar pagos arbitrariamente;
- un pedido no puede generar doble cobro ni doble restitución de stock;
- las reservas expiradas se liberan de forma automática y observable;
- las transiciones de estado inválidas son rechazadas en todos los casos;
- dinero, descuentos, ganancias y stock mantienen invariantes comprobadas;
- cuentas desactivadas o degradadas pierden acceso dentro del SLA definido;
- no existen vulnerabilidades críticas o altas conocidas sin excepción formal;
- existe una suite de pruebas automatizadas y CI obligatorio;
- hay monitoreo de errores y alertas operativas configuradas;
- las consultas tienen límites y las pantallas no dependen de cargar toda la base;
- la documentación coincide con el repositorio;
- no quedan P0/P1 abiertos sin aceptación formal de riesgo.

## 38. Resultado esperado

Al completar la Parte I, el proyecto actual será técnicamente defendible para una operación controlada: seguro en sus flujos críticos, comprobable, observable y mantenible. Los errores de integridad de pagos, stock y estados quedan resueltos. El código es verificable, desplegable con confianza y documentado de forma que cualquier desarrollador pueda entenderlo y modificarlo sin romper el sistema.
