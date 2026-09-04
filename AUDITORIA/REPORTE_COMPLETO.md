# Reporte consolidado de auditoría técnica de SIPRO

Fecha de corte: 2026-09-03
Versión recuperada: 1.2.0
Estado del reporte: auditoría ejecutada con evidencia estática y dinámica; correcciones funcionales aún no iniciadas.

## Credenciales para el entorno local

| Cuenta | Correo | Contraseña | Rol |
| --- | --- | --- | --- |
| Administrador ficticio | `admin.local@example.invalid` | `AuditOnly-Admin-123!` | `superadmin` |
| Operador ficticio | `operador.local@example.invalid` | `AuditOnly-User-123!` | `usuario` |
| Administrador hardcodeado por SIPRO | `admin@sistem.com` | `contra1234` | `admin` |

Estas credenciales son para Supabase local. La última no es una recomendación: es evidencia del defecto en `SRC/index.js:112-126`. No se incluyen valores del `.env` remoto recuperado.

## Resumen ejecutivo

SIPRO se encuentra en **estado crítico desde el punto de vista de seguridad**, aunque sus flujos básicos de inventario sí pueden ejecutarse. El problema central es la combinación de datos no confiables insertados mediante `innerHTML`, acceso Node habilitado en el renderer, falta de aislamiento de contexto y acceso directo a Supabase con una anon key. Se demostró XSS almacenado en local y se verificó que `require` está disponible en el mismo contexto.

La aplicación no usa Supabase Auth. El login descarga todas las filas de `usuarios`, compara contraseñas en texto claro dentro del renderer y guarda el usuario completo —incluida contraseña— en `sessionStorage`. Los roles se documentan y almacenan, pero no restringen operaciones. Existe además una cuenta administrativa con contraseña fija creada automáticamente al arrancar.

En integridad de inventario se reprodujeron dos defectos graves: los movimientos se duplican porque la aplicación inserta un registro además del trigger, y las operaciones concurrentes realizan un patrón leer-calcular-escribir sin transacción ni operación atómica. Dos salidas concurrentes pudieron informar éxito usando el mismo stock.

## Alcance y aislamiento

- Se inspeccionaron los 43 archivos propios del proyecto, configuración, documentación, scripts, vistas, modelos y DDL.
- No se ejecutó ninguna escritura contra Supabase remoto.
- El `.env` remoto solo se clasificó por tipo: URL HTTPS remota + legacy anon JWT; sus valores no se copiaron.
- Toda escritura y prueba se realizó en Supabase local sobre Docker.
- No se ejecutó `make` ni `package`, porque la configuración vigente copiaría `.env` al artefacto.
- El proyecto no contiene `.git`; no se creó una historia ficticia.

## Arquitectura real

```text
BrowserWindow Electron
  ├─ renderer HTML/JS (Node habilitado)
  │    ├─ requiere modelos directamente
  │    ├─ usa ipcRenderer directamente
  │    └─ carga Bootstrap/Bootstrap Icons desde CDN
  ├─ main process
  │    ├─ navegación, diálogos y exportación
  │    └─ IPC para dashboard/movimientos/Excel
  └─ Supabase Data API
       ├─ usuarios
       ├─ categorias
       ├─ productos
       └─ movimientos_stock

server.js (Express) ── desconectado del arranque Electron
preload.js ── existe, pero BrowserWindow no lo carga
```

## Evidencia reproducida

| Prueba | Resultado |
| --- | --- |
| Arranque Electron con entorno local | Correcto; login y cinco vistas cargaron |
| Suite `npm run test:audit` | 5/5 |
| XSS almacenado en nombre de producto | Reproducido, `xssExecuted=true` |
| Node en renderer | Confirmado, `typeof require === 'function'` |
| Password en sesión | Confirmado, `storedHasPassword=true` |
| Duplicación de movimiento | 2 filas por una entrada |
| Carrera de stock | Dos salidas aprobadas; stock final refleja solo una |
| Stock negativo vía Data API | Aceptado por la BD |
| Escala a 1.503 productos | Modelo recibió 1.000 sin advertencia |
| API Express productos | HTTP 200 |
| API Express usuarios | HTTP 500 |
| CORS de Express | `Access-Control-Allow-Origin: *` y métodos mutables |
| Auditoría npm | 40 avisos totales |

## Hallazgos críticos

### SEC-001 — XSS almacenado con capacidad Node

- Archivo: `SRC/js/CRUDPRODUCTO.js:200-221`, también patrones equivalentes en usuarios y movimientos.
- Causa: interpolación de datos de BD en `tr.innerHTML` sin escape.
- Amplificador: `SRC/index.js:63-66` habilita Node y desactiva aislamiento.
- Impacto: lectura/escritura de archivos, ejecución de procesos y acceso a credenciales si un valor malicioso llega a la BD.
- Evidencia: payload ficticio ejecutado por el recorrido CDP local.
- Corrección mínima propuesta: construir celdas con `textContent`; luego aislar renderer y exponer IPC mínimo desde preload.

### SEC-002 — Contraseñas en texto claro y exposición masiva

- Archivos: `SRC/db/usuarioModel.js:12-19`, `SRC/js/login.js:23-28`, `SRC/js/CRUDUSUARIO.JS:84-88`.
- Comportamiento: `select('*')` descarga todas las contraseñas; login compara texto claro; edición rellena el password; sesión guarda la fila completa.
- Impacto: compromiso total de cuentas ante acceso al renderer o Data API.
- Corrección propuesta: migrar a Supabase Auth o hash robusto en backend; nunca devolver hashes/contraseñas al renderer.

### AUTH-001 — Ausencia de autenticación/autorización efectiva

- Archivos: `SRC/js/panelPrincipal.js:27-37`, modelos completos y vistas.
- Evidencia: la función de roles dice “por ahora mostramos todo”; cualquier vista puede navegarse directamente; CRUD usa anon key sin sesión.
- Impacto: usuarios no autenticados o de rol básico pueden ejecutar operaciones administrativas.
- Requiere validación: matriz exacta de permisos por rol antes de corregir.

### SEC-003 — Administrador con credencial conocida

- Archivo: `SRC/index.js:112-126`.
- Comportamiento: en cada arranque se busca `admin@sistem.com` y, si falta, se crea con `contra1234`.
- Impacto: acceso administrativo predecible.
- Corrección propuesta: eliminar bootstrap en runtime; aprovisionamiento único con secreto temporal y cambio obligatorio.

## Hallazgos altos

### DB-001 — Historial duplicado

`entradaProducto` y `salidaProducto` actualizan stock y luego insertan movimiento; el trigger de BD también inserta. Se reprodujeron dos filas idénticas por una entrada.

### DB-003 — Condición de carrera

Las operaciones leen stock, calculan en memoria y actualizan después. Dos salidas concurrentes de 7 sobre 10 aprobaron ambas, pero el stock final fue 3. Debe reemplazarse por una RPC/transacción atómica con bloqueo o `UPDATE ... WHERE stock >= cantidad RETURNING` y un único mecanismo de auditoría.

### DB-004 — Eliminación no transaccional

`deleteProductoDesvincular` primero pone `producto_id = null` y luego borra. Si el segundo paso falla, queda una modificación parcial. Debe realizarse en una transacción/RPC o mediante una FK deliberada (`ON DELETE SET NULL`) tras validar negocio.

### SEC-004 — Exposición de configuración y acceso anónimo

`forge.config.js` incluye `.env` como recurso. La variable es una legacy anon key —no service role—, por lo que su presencia en un cliente no es por sí sola un secreto criptográfico; el riesgo crítico es que SIPRO realiza CRUD sin sesión, lo que implica políticas anónimas amplias o RLS deshabilitado. Se requiere inspección remota exclusivamente de solo lectura y autorizada antes de afirmar su estado exacto. Tras corregir RLS, debe rotarse la clave distribuida.

### SEC-005 — CDN remoto dentro de renderer privilegiado

Las vistas cargan Bootstrap desde jsDelivr, sin CSP ni SRI. Con Node habilitado, una alteración de contenido remoto tiene impacto de ejecución local.

### SEC-006 / BUG-001 — API Express insegura y parcialmente rota

`server.js` usa CORS abierto y no autentica rutas CRUD. La ruta de usuarios falla porque el adaptador solo detecta SQL con `app.`. Las escrituras de productos omiten columnas requeridas. No está conectada a scripts npm, por lo que se clasifica como código posiblemente abandonado, pero sería peligrosa si se desplegara.

### PERF-001 — Truncamiento silencioso y falta de paginación

Todos los listados cargan colecciones completas y filtran en renderer. PostgREST local limitó 1.503 productos a 1.000, haciendo que 503 desaparecieran de la interfaz sin error.

### DEP-001 — Dependencias vulnerables

`npm audit` reportó 1 crítico, 35 altos, 3 moderados y 1 bajo. Hay avisos relevantes para Electron 36.9.5, `electron-updater` 6.6.2, `ws`, Express/transitivos y la toolchain Forge. No se ejecutó `npm audit fix` ni actualización masiva.

### ARCH-001 — Límites de confianza inexistentes

UI, negocio y acceso a datos corren dentro del renderer; main también accede a los mismos modelos; existe un servidor alternativo. Esto duplica rutas y hace imposible aplicar autorización central.

### TEST-001 — Proyecto original sin pruebas

No había tests unitarios, integración, BD ni E2E. Se añadió una suite de evidencia separada sin corregir funcionalidad.

## Hallazgos medios y bajos

- `DB-002`: falta `CHECK (stock >= 0)`; reproducido con `-1`.
- `DB-005`: faltan checks para tipo/cantidad de movimiento, rol y cantidades/precios de detalle.
- `DB-006`: documentación crea `app.*`; runtime consulta `public` implícitamente.
- `DB-007`: no hay índices para FK/filtros de `movimientos_stock.producto_id`, `fecha`, categorías o detalles.
- `BUG-002`: rutas erróneas y carga clásica de `notificaciones.js` provocan 404 y `SyntaxError`; en panel `mostrarToast` es `undefined`.
- `FUNC-001`: “Movimientos Hoy” está fijado a cero.
- `FUNC-002`: `getIngresosPorMes` siempre devuelve `[]`; facturas y detalle no tienen flujo conectado.
- `PERF-002`: exportación carga productos con todos sus movimientos y agrega en memoria, sin límite.
- `PERF-003`: dashboard consulta listas completas de productos y usuarios cada 30 segundos.
- `DEP-002`: Forge 6.4.2 se mezcla con publisher GitHub 7.x; hay dependencias extraneous y no usadas.
- `DEAD-001`: preload no está configurado y su API no aparece en `window`.
- `DEAD-002`: `server.js`, el adaptador SQL y varias dependencias parecen desconectados.
- `DOC-001`: README y manual describen PostgreSQL directo y rutas de exportación distintas a la implementación.
- `LOG-001`: logging solo por consola, sin niveles, correlación, persistencia ni redacción sistemática.
- `ENV-001`: `.env.example` conserva variables `DB_*` que el runtime no usa y omite variables del keep-alive.

## Componentes que conviene preservar

- Consultas Supabase usan filtros estructurados, no concatenación SQL con datos de usuario.
- Restricciones UNIQUE de email, código de barras y categoría.
- `CHECK (precio >= 0)`.
- Relaciones FK principales y conservación deliberada de historial al permitir producto nulo.
- Exportación Excel usa ruta elegida por diálogo y genera hojas legibles con encabezados, filtros y columnas.
- `loadEnv` contempla desarrollo y aplicación empaquetada, aunque no debe usarse para distribuir secretos.
- El lanzador de auditoría se niega a aceptar una URL no-local.

## Orden recomendado

1. P0: neutralizar XSS; deshabilitar Node en renderer; activar `contextIsolation`, preload mínimo y navegación/CSP.
2. P0: sustituir contraseñas en texto claro y cuenta hardcodeada; definir autenticación/autorización y RLS.
3. P0: sacar `.env` del paquete y rotar la anon key después de cerrar políticas.
4. P1: hacer atómicas las operaciones de stock y dejar un solo productor de movimientos.
5. P1: añadir constraints e índices con pruebas de BD.
6. P1: decidir y retirar o asegurar `server.js`.
7. P2: paginación/búsqueda server-side y agregados de reportes.
8. P2: corregir errores de scripts/notificaciones y completar dashboard.
9. P2: actualizar dependencias de manera escalonada, empezando por parches de runtime.
10. P3: limpiar código muerto y reconciliar documentación.

## Cómo ejecutar el entorno local

```powershell
npx supabase start
npm run test:audit
npm run start:audit
```

Para detenerlo sin eliminar datos:

```powershell
npx supabase stop
```

El resto de la documentación segmentada se mantiene en los archivos numerados de `AUDITORIA/` y en `INVENTARIO_HALLAZGOS.md`.
