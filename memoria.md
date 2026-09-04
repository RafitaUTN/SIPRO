# Memoria viva del proyecto SIPRO

Última actualización: 2026-09-04 (America/Costa_Rica).

## Propósito

Este archivo es la memoria operativa permanente de SIPRO. Debe actualizarse con cada cambio relevante, decisión, prueba, despliegue o bloqueo. No se guardan aquí tokens, claves privadas ni contraseñas remotas.

## Ubicación y producto

- Raíz efectiva: `C:\Users\rafad\Music\SIPRO_proyecto_recuperado_COMPLETO\SIPRO_proyecto_recuperado`.
- Aplicación Electron de inventario del Hotel El Silencio del Campo.
- Entry point: `SRC/index.js`.
- Versión actual: `1.2.0`.
- Base de datos remota solicitada: Supabase `mopgfccvkfyhccvzxmoe`.
- Repositorio previsto: `RafitaUTN/SIPRO`.
- Facturación permanece fuera del alcance porque el código recuperado no tiene un flujo funcional ni reglas fiscales definidas.

## Arquitectura vigente

1. Electron main conserva la sesión y aplica permisos antes de cada operación IPC.
2. Renderer con `nodeIntegration: false`, `contextIsolation: true` y `sandbox: true`.
3. `preload.js` expone una API mínima y permitida; el origen de cada invocación IPC se valida.
4. Supabase Auth autentica usuarios. Las contraseñas no existen en tablas SIPRO ni se devuelven al renderer.
5. PostgreSQL aplica RLS según `app_metadata.app = sipro` y `app_metadata.role`.
6. La administración de cuentas usa la Edge Function `sipro-admin-users`; la service role nunca se distribuye en Electron.
7. El stock se modifica mediante RPC atómica y registra exactamente un movimiento.
8. Electron Forge genera Squirrel/ZIP y GitHub Actions publica tags en Releases.

## Aislamiento en Supabase

La base indicada ya contiene otra aplicación. Para no interferir con ella, todos los objetos nuevos usan prefijo `sipro_` dentro de `public`:

- `sipro_usuarios`
- `sipro_categorias`
- `sipro_productos`
- `sipro_movimientos_stock`
- `sipro_role()`
- `sipro_crear_producto(...)`
- `sipro_ajustar_stock(...)`
- `sipro_handle_new_auth_user()`

La migración no elimina, renombra ni altera tablas sin prefijo SIPRO. Antes de aplicarla remotamente se debe inspeccionar el esquema y ejecutar `supabase db push --dry-run`.

## Datos de demostración

La migración `20260904061438_seed_sipro_demo_data.sql` contiene 8 categorías, 20 productos hoteleros realistas y movimientos iniciales. Todos son ficticios; no incluyen datos personales reales. Los usuarios se crean en Supabase Auth mediante `scripts/provision-sipro-users.js`. `supabase/seed.sql` queda vacío porque la carga idempotente está versionada como migración y debe aplicarse también en remoto.

Las credenciales de entrega se mantienen únicamente en `CREDENCIALES_ACCESO.md`, archivo ignorado por Git.

## Seguridad corregida

- Eliminado acceso Node desde renderers y dependencias CDN.
- CSP local en todas las vistas.
- Eliminada cuenta administrativa hardcodeada y bootstrap anónimo.
- Eliminadas contraseñas en texto claro y hashes propios del contrato activo.
- DTO de sesión sin contraseña ni tokens.
- RLS habilitado en todas las tablas SIPRO expuestas.
- Roles obtenidos de `app_metadata`, no de metadatos editables por el usuario.
- Usuario de consulta solo lee; inventario/encargado gestionan catálogo y stock; admin gestiona usuarios y elimina productos.
- Actualización de stock condicional, atómica y con `CHECK (stock >= 0)`.
- Archivos de reporte solo pueden abrirse si fueron generados por la sesión actual.
- `.env`, credenciales, llaves de firma, `node_modules` y artefactos quedan fuera de Git.

## Evidencia verde acumulada

- `npm test`: 6/6 pruebas de contrato y seguridad.
- `npm run test:integration`: 3/3 pruebas contra Supabase local.
- RLS: lectura anónima bloqueada y lectura autenticada permitida.
- Concurrencia: dos salidas de 7 sobre stock 10 producen una sola aprobación y stock final 3.
- Edge Function: creación y eliminación real de usuario Auth verificada localmente.
- Recorrido Electron por CDP: login, panel, productos, usuarios y movimientos sin errores de renderer.
- XSS almacenado: payload renderizado como texto; `xssExecuted=false`.
- Renderer: `typeof require === undefined`.
- `npm audit`: 0 vulnerabilidades tras actualizar Forge y fijar dependencias transitivas.
- `npm run make`: build definitivo correcto con Electron Forge 7.11.2; generó Squirrel y ZIP en `out/make`.
- El ejecutable empaquetado fue iniciado contra Supabase local y repitió el recorrido CDP completo sin errores ni XSS.

## Estado remoto

- GitHub CLI autenticada como `RafitaUTN` con permisos de repositorio y workflows.
- Repositorio privado creado y publicado: `https://github.com/RafitaUTN/SIPRO`.
- Release privado `v1.2.0` publicado con Setup, paquete NuGet, ZIP y manifiesto `RELEASES`. GitHub Actions terminó en verde en 5 min 9 s: `https://github.com/RafitaUTN/SIPRO/actions/runs/33848211518`.
- Supabase CLI autorizada y proyecto `mopgfccvkfyhccvzxmoe` enlazado; estado remoto saludable y PostgreSQL `17.6.1.113`.
- Se inspeccionó el esquema antes de escribir. La otra aplicación conserva `images`, `monitor_history`, `monitor_state`, `productos` y `users_profile` sin cambios de SIPRO.
- Migraciones SIPRO de esquema aislado, datos de demostración y endurecimiento aplicadas.
- Edge Function `sipro-admin-users` desplegada y verificada remotamente.
- Cuatro cuentas Auth SIPRO aprovisionadas y verificadas: admin, encargado, inventario y consulta.
- El proyecto tiene un límite personalizado de cinco cuentas Auth: una cuenta ajena más cuatro SIPRO dejan la capacidad en 5/5. No se modificó la cuenta de la otra aplicación.
- Validación remota: 4 usuarios, 8 categorías y 20 productos; lectura anónima y escritura de consulta bloqueadas; ajuste de stock reversible y función administrativa correctos. Los 11 movimientos creados por verificaciones reversibles/XSS se eliminaron de forma dirigida; quedaron los 20 movimientos iniciales de demostración.
- La aplicación empaquetada usa la URL y clave publicable incorporadas. Nunca contiene la service role y ya no lee `.env` de desarrollo desde el directorio de ejecución.
- Prueba empaquetada contra remoto: login y sesión admin, panel con datos, productos, 4 usuarios y movimientos; cero errores de renderer, `require` ausente y XSS no ejecutado.
- Los asesores remotos reportan hallazgos heredados de la otra aplicación. En SIPRO se revocó la ejecución directa del trigger, se optimizaron políticas RLS y se añadió el índice de usuario. Las dos RPC de negocio permanecen intencionalmente `SECURITY DEFINER`, con ejecución solo autenticada y validación interna estricta de roles.

## Única decisión pendiente del propietario

Definir si `RafitaUTN/SIPRO` puede hacerse público o si se creará un canal público separado para los binarios. GitHub Actions y el actualizador ya están configurados, pero el servicio público de actualización de Electron no puede entregar releases de un repositorio privado. No se cambia la visibilidad sin autorización explícita.

## Comandos de continuidad

```powershell
npm test
npx supabase db reset --local
npm run test:integration
node scripts/verify-sipro-remote.js
npm run make
```

La prueba de integración se niega a operar contra URLs remotas. Las operaciones remotas se ejecutan solo después de inspección y dry-run.
