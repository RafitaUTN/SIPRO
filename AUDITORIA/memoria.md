# Memoria persistente del proyecto SIPRO

Última actualización: 2026-09-03 (America/Costa_Rica)

## Objetivo y reglas permanentes

- Auditar y recuperar SIPRO 1.2.0 sin reescritura masiva ni cambios arbitrarios de negocio.
- Toda prueba de datos se ejecuta exclusivamente contra Supabase/PostgreSQL local en Docker.
- Nunca probar operaciones destructivas contra servicios remotos ni copiar secretos reales.
- Antes de corregir comportamiento existente: reproducir, crear prueba, aplicar cambio mínimo y verificar regresión.
- Los hallazgos dudosos de negocio se marcan `REQUIERE_VALIDACIÓN`.

## Ubicación y estado del proyecto

- Raíz efectiva: `C:\Users\rafad\Music\SIPRO_proyecto_recuperado_COMPLETO\SIPRO_proyecto_recuperado`.
- Proyecto recuperado sin directorio `.git`; no existe historial Git local.
- Entry point: `SRC/index.js`.
- Electron 36.9.5 y Electron Forge 6.4.2.
- Node detectado: 24.18.0; npm: 11.7.0; Docker Engine: 29.6.2 Linux.
- Código propio inventariado: 43 archivos fuera de `node_modules` y artefactos.

## Arquitectura observada

1. Electron main crea una sola `BrowserWindow` y registra IPC para dashboard y exportaciones.
2. Renderers locales cargan Bootstrap desde CDN y, por `nodeIntegration: true`, importan directamente modelos de datos y `ipcRenderer`.
3. Los modelos crean clientes `@supabase/supabase-js` con URL y anon/publishable key.
4. `preload.js` existe pero no está configurado en `BrowserWindow`; actualmente no participa.
5. `server.js` implementa otra API Express, pero ningún script npm ni la aplicación Electron lo inicia.
6. La persistencia efectiva usa la Data API/PostgREST de Supabase, no una conexión PostgreSQL directa.

## Entorno local creado

- CLI Supabase fijada como devDependency: `2.116.0`.
- Configuración: `supabase/config.toml`.
- Migración: `supabase/migrations/20260903193354_recovered_schema.sql`.
- Datos ficticios: `supabase/seed.sql`.
- Variables locales ignoradas por Git: `.env.audit`.
- Lanzador con bloqueo de URL no-local: `scripts/start-audit.ps1` / `npm run start:audit`.
- Pruebas: `tests/audit/current-behavior.test.js` / `npm run test:audit`.
- Automatización de recorrido Electron por CDP: `scripts/cdp-audit.js`.

## Credenciales exclusivamente locales

| Uso | Correo | Contraseña | Rol |
| --- | --- | --- | --- |
| Auditoría local | `admin.local@example.invalid` | `AuditOnly-Admin-123!` | `superadmin` |
| Auditoría local | `operador.local@example.invalid` | `AuditOnly-User-123!` | `usuario` |
| Cuenta creada automáticamente por el código recuperado | `admin@sistem.com` | `contra1234` | `admin` |

La tercera cuenta demuestra el defecto de credenciales hardcodeadas. Solo debe existir en el entorno local. No se documentan claves del `.env` remoto.

## Evidencia dinámica acumulada

- `npm run test:audit`: 5/5 pruebas pasaron.
- Una entrada de stock genera 2 movimientos: trigger de BD + inserción de aplicación.
- Dos salidas concurrentes de 7 sobre stock 10 fueron aprobadas; stock final 3 (actualización perdida).
- La BD aceptó stock `-1` porque no existe `CHECK (stock >= 0)`.
- Electron arrancó con Supabase local y completó login, panel, productos, usuarios y movimientos.
- XSS almacenado reproducido con un producto ficticio: `xssExecuted=true`.
- En el mismo renderer, `typeof require === 'function'`; por tanto el XSS puede alcanzar APIs Node.
- La sesión del renderer conserva la propiedad `password` completa.
- El dashboard muestra movimientos del día como `0` fijo.
- La carga de 1.503 productos produjo solo 1.000 filas en el modelo por el límite de PostgREST, sin aviso.
- API Express: `GET /api/productos` devolvió 200; `GET /api/usuarios` devolvió 500; CORS aceptó origen `*` y métodos mutables.
- Renderer: errores reproducidos por rutas incorrectas a `notificaciones.js` y carga clásica de un archivo con sintaxis ESM.

## Hallazgos prioritarios

1. `SEC-001` — CRÍTICO: XSS almacenado + Node integration equivale a posible ejecución arbitraria.
2. `SEC-002` — CRÍTICO: contraseñas en texto claro se descargan al renderer y se guardan en sesión.
3. `AUTH-001` — CRÍTICO: no existe autorización real; roles no se aplican.
4. `SEC-003` — CRÍTICO: cuenta administrativa y contraseña hardcodeadas.
5. `DB-001` — ALTO: movimientos duplicados.
6. `DB-003` — ALTO: carrera en entradas/salidas y actualizaciones perdidas.
7. `PERF-001` — ALTO: listas completas, filtro frontend y truncamiento silencioso a 1.000.
8. `BUG-001` — ALTO: servidor REST parcialmente roto y sin autenticación si se activa.
9. `DEP-001` — ALTO: 40 avisos npm (1 crítico, 35 altos, 3 moderados, 1 bajo).
10. `SEC-005` — ALTO: scripts remotos sin CSP/SRI dentro de renderer con privilegios Node.

## Decisiones pendientes

- Confirmar si la base remota real usa tablas en `public` o en el esquema `app`; el código y el DDL se contradicen.
- Confirmar reglas de acceso por rol (`admin`, `superadmin`, `usuario`) antes de implementar autorización.
- Confirmar si las facturas son funcionalidad vigente o código abandonado.
- No rotar aún la anon key remota: primero corregir RLS/autorización y luego rotar como medida de contención.

## Próximos pasos acordados

1. Completar los 21 documentos requeridos en `AUDITORIA/`.
2. Ejecutar reset reproducible del stack y repetir pruebas.
3. No empaquetar mientras `forge.config.js` siga incluyendo `.env` como recurso.
4. Preparar plan P0-P3; no aplicar correcciones funcionales hasta cerrar la auditoría.

## Comandos seguros de continuidad

```powershell
npx supabase start
npm run test:audit
npm run start:audit
npx supabase stop
```

No usar `supabase link`, `db push` ni credenciales remotas durante esta auditoría.
