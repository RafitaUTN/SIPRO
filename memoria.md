# Memoria viva del proyecto SIPRO

Última actualización: 2026-09-05 (America/Costa_Rica).

## Propósito

Este archivo es la memoria operativa permanente de SIPRO. Debe actualizarse con cada cambio relevante, decisión, prueba, despliegue o bloqueo. No se guardan aquí tokens, claves privadas ni contraseñas remotas.

## Ubicación y producto

- Raíz efectiva: `C:\Users\rafad\Music\SIPRO_proyecto_recuperado_COMPLETO\SIPRO_proyecto_recuperado`.
- Aplicación Electron de inventario del Hotel El Silencio del Campo.
- Entry point: `SRC/index.js`.
- Versión publicada actual: `1.2.3`.
- Base de datos de producción: Supabase `ndrcwqcqtymcjhkcscdp` (`hotelelsilenciodelcampo`).
- Repositorio público: `RafitaUTN/SIPRO`.
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
- `npm test` en 1.2.1: 7/7; incluye contrato de icono, keep-alive, tipografía y apilamiento de notificaciones.
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
- Repositorio público creado y publicado: `https://github.com/RafitaUTN/SIPRO`.
- Release `v1.2.0` publicado con Setup, paquete NuGet, ZIP y manifiesto `RELEASES`. GitHub Actions terminó en verde en 5 min 9 s: `https://github.com/RafitaUTN/SIPRO/actions/runs/33848211518`.
- Supabase CLI autorizada y proyecto `mopgfccvkfyhccvzxmoe` enlazado; estado remoto saludable y PostgreSQL `17.6.1.113`.
- Se inspeccionó el esquema antes de escribir. La otra aplicación conserva `images`, `monitor_history`, `monitor_state`, `productos` y `users_profile` sin cambios de SIPRO.
- Migraciones SIPRO de esquema aislado, datos de demostración y endurecimiento aplicadas.
- Edge Function `sipro-admin-users` desplegada y verificada remotamente.
- Cuatro cuentas Auth SIPRO aprovisionadas y verificadas: admin, encargado, inventario y consulta.
- El error de creación de usuarios provenía del trigger heredado `enforce_max_five_users`, que contaba perfiles de ambas aplicaciones. La migración `20260904081213_isolate_sipro_auth_profiles.sql` conserva el límite de cinco para la aplicación anterior, excluye cuentas SIPRO y eliminó únicamente los perfiles SIPRO copiados por error a `users_profile`.
- Validación remota: 4 usuarios, 8 categorías y 21 productos (20 de demostración y 1 creado por el usuario, preservado); lectura anónima y escritura de consulta bloqueadas; ajuste de stock reversible y función administrativa correctos. Se eliminaron de forma dirigida únicamente los movimientos temporales de verificación/XSS.
- La aplicación empaquetada usa la URL y clave publicable incorporadas. Nunca contiene la service role y ya no lee `.env` de desarrollo desde el directorio de ejecución.
- Prueba empaquetada contra remoto: login y sesión admin, panel con datos, productos, 4 usuarios y movimientos; cero errores de renderer, `require` ausente y XSS no ejecutado.
- Los asesores remotos reportan hallazgos heredados de la otra aplicación. En SIPRO se revocó la ejecución directa del trigger, se optimizaron políticas RLS y se añadió el índice de usuario. Las dos RPC de negocio permanecen intencionalmente `SECURITY DEFINER`, con ejecución solo autenticada y validación interna estricta de roles.
- Workflow `supabase-keepalive.yml`: programado cada seis horas (minuto 17), ejecuta el RPC existente `keepalive()` equivalente a `SELECT 1`, exige respuesta exacta `1` y usa solo URL/clave publicable guardadas como variables de GitHub.
- La migración `20260904084451_harden_keepalive_function.sql` cambió `keepalive()` a `SECURITY INVOKER`, fijó `search_path` vacío y limitó su ejecución a `anon`, `authenticated` y `service_role`. Conserva el resultado `1`; desaparecieron sus avisos del asesor de seguridad.
- Instalación 1.2.1 probada sobre Windows con Squirrel: código de salida 0, 8.8 segundos y carpeta `app-1.2.1` correcta. El arranque normal queda deshabilitado durante hooks Squirrel para evitar el timeout que provocaba “Installation has failed” aunque la instalación hubiera terminado.
- Identidad visual 1.2.1: `favicon.ico` aplicado a ejecutable, Setup, ventana y acceso directo. El acceso directo probado apunta al ejecutable instalado y obtiene el icono de este.
- UI 1.2.1 instalada y probada contra remoto: texto descriptivo a 16 px, fecha a 15 px, ambos más oscuros; toast a un lado del modal en escritorio, con `z-index 300` sobre el modal `100`; creación y eliminación de usuario desde la interfaz confirmadas.

## Publicación 1.2.1

- Commit funcional publicado: `f08c0bf` (`fix: publicar SIPRO 1.2.1 con Auth e instalador corregidos`).
- Repositorio convertido a público para permitir actualizaciones anónimas mediante `update.electronjs.org`.
- Workflow keep-alive ejecutado manualmente en verde antes y después del endurecimiento: `https://github.com/RafitaUTN/SIPRO/actions/runs/33853338668` y `https://github.com/RafitaUTN/SIPRO/actions/runs/33855130942`.
- Tag y release pública `v1.2.1` publicados con `RELEASES`, `.nupkg`, Setup y ZIP: `https://github.com/RafitaUTN/SIPRO/releases/tag/v1.2.1`.
- Workflow de release finalizado en verde en 10 min 3 s: `https://github.com/RafitaUTN/SIPRO/actions/runs/33853368004`.
- El icono remoto requerido por Squirrel responde HTTP 200.
- El servicio oficial conserva el catálogo de releases durante 15 minutos. Después de esa propagación, el endpoint entregó `SIPRO-1.2.1-full.nupkg` a la instalación pública `1.2.0`.
- Actualización remota comprobada de extremo a extremo: `1.2.0` descargó los 172,546,285 bytes del `.nupkg`, Squirrel creó `app-1.2.1` y terminó sin error. Tras reiniciar desde el acceso estable `SIPRO.exe`, todos los procesos se ejecutaron desde `app-1.2.1`; `ProductVersion` y `FileVersion` fueron `1.2.1`.
- Las acciones de checkout y Node del workflow quedaron actualizadas a v5 para evitar la advertencia de deprecación de Node 20 en futuras releases.

## Comandos de continuidad

```powershell
npm test
npx supabase db reset --local
npm run test:integration
node scripts/verify-sipro-remote.js
npm run make
```

La prueba de integración se niega a operar contra URLs remotas. Las operaciones remotas se ejecutan solo después de inspección y dry-run.

## Integración de producción del 5 de septiembre de 2026

- Proyecto confirmado: `ndrcwqcqtymcjhkcscdp`, `hotelelsilenciodelcampo`, PostgreSQL 17.6.1.063 y estado saludable.
- Antes de escribir se creó `BD_SUPABASE_PRODUCCION/sipro-public-2026-09-05T02-56-52-205Z.json`, 1.641.929 bytes, SHA-256 `ce929cd819270bd003f2ce9be7bf039fb2dfba522faf2349e42cda569e4a5ea5`; contiene el estado actual de las cuatro tablas funcionales y está ignorado por Git.
- Estado heredado preservado: 16 categorías, 565 productos, 8.934 movimientos y 4 usuarios. Cero duplicados, huérfanos, cantidades inválidas, precios negativos o stock negativo.
- Se creó en paralelo el esquema seguro `sipro_*` y se copiaron los datos con cero diferencias. Las tablas heredadas no fueron eliminadas, renombradas ni actualizadas.
- Los cuatro accesos heredados se migraron a Supabase Auth; las contraseñas se convirtieron internamente a bcrypt. El login de las cuatro cuentas fue verificado.
- `sipro-admin-users` está activo con JWT obligatorio. La creación/eliminación temporal se verificó y dejó cero residuos.
- La aplicación, el ejecutable empaquetado y `.env` apuntan a producción mediante la clave publicable; la versión publicada es 1.2.3.
- GitHub `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` apuntan a producción. Keep-alive manual verde: ejecución `33971224377`.
- Evidencia: pruebas 12/12, `npm audit` 0 vulnerabilidades, recorrido Electron de desarrollo y empaquetado sin errores, build Squirrel/ZIP correcto y línea base de producción preservada.
- El workflow diario usa la API autenticada para exportar las cuatro tablas `sipro_*`, valida la línea base, cifra con AES-256 y conserva el artefacto privado durante 14 días. No sustituye un dump completo de PostgreSQL.
- Los secretos de respaldo están configurados en GitHub. La copia local de `BACKUP_ENCRYPTION_PASSWORD` está en `CREDENCIALES_RESPALDO.md`, excluida de Git.

## Trabajo incorporado en 1.2.2

- Se eliminó el destello blanco de la primera navegación: la vista anterior permanece visible hasta que el HTML, CSS y scripts del siguiente módulo estén preparados; además se usa caché local de vistas.
- La identidad del login, el título de la ventana y el sidebar muestran el nombre completo “Hotel El Silencio del Campo”.
- Las validaciones de usuarios, productos y movimientos ahora explican el campo incorrecto. Los prefijos IPC y detalles de Supabase/PostgREST se convierten en mensajes comprensibles antes de mostrarse.
- La actualización descargada usa un modal propio de SIPRO con el logotipo del hotel. “Más tarde” espera dos minutos sin interacción y sin operaciones IPC activas antes de instalar.
- Se retiraron animaciones de entrada, transformaciones y desenfoques costosos para mejorar el uso en computadoras antiguas.
- Se analizó sin exponer datos el respaldo legado del 2 de septiembre de 2026: 16 categorías, 565 productos, 8.773 movimientos y 4 usuarios de aplicación; sin duplicados, huérfanos, cantidades inválidas ni stock negativo.
- El respaldo contiene `auth`, `storage` y `vault`; está excluido de Git y no debe publicarse. Las contraseñas antiguas no se reutilizarán.
- Se preparó una migración paralela y reversible hacia `sipro_*`, un validador SQL y un migrador de Auth con simulación obligatoria, confirmación explícita, contraseñas temporales y rollback de usuarios creados en la misma ejecución.
- El workflow diario de respaldo lógico está activo; la ejecución `33971301765` exportó, validó, cifró y cargó correctamente el artefacto privado.
- Verificación posterior: contrato 12/12, `npm audit` con 0 vulnerabilidades, recorrido Electron sin errores ni instantes vacíos y `npm run make` correcto. La migración SQL también se ensayó en una base temporal: recuentos exactos, cero diferencias y cero huérfanos.
- Release público `v1.2.2` generado por GitHub Actions en la ejecución `33971328948`; instalador, paquete Squirrel y ZIP cargados correctamente.
- La verificación del 5 de septiembre aceptó correctamente un movimiento nuevo realizado durante la prueba manual y confirmó que no disminuyó ningún recuento base del respaldo.

## Corrección de visibilidad de contraseñas para 1.2.3

- Causa del fallo: Lucide reemplazaba el elemento que tenía registrado el evento de clic, dejando el icono visible pero sin listener.
- Se creó un control compartido que conserva un botón estable, alterna `password`/`text`, actualiza icono y atributos accesibles, y mantiene intacto el valor escrito.
- El login permite mostrar y ocultar la contraseña ingresada.
- Crear usuario incorpora el mismo control y exige una contraseña inicial de al menos 12 caracteres.
- Editar usuario mantiene el campo vacío, nunca intenta recuperar la contraseña actual y permite visualizar únicamente la nueva contraseña escrita en ese momento.
- Verificación: contrato 13/13, `npm audit` con 0 vulnerabilidades, build Squirrel/ZIP correcto y recorridos Electron de desarrollo y empaquetado sin errores. Ambas pruebas comprobaron visible, oculto y conservación del texto en login, creación y edición.
- La prueba contra producción eliminó sus usuarios y productos temporales; el estado final confirmó 16 categorías, 565 productos, 8.935 movimientos preservados y 4 usuarios.
- Commit funcional publicado: `9718ceb` (`fix: habilitar visibilidad segura de contraseñas`).
- Respaldo cifrado y keep-alive del mismo commit finalizados en verde: ejecuciones `33973799903` y `33973801281`.
- Release público `v1.2.3` generado por GitHub Actions en la ejecución `33973823219`; `RELEASES`, paquete Squirrel, instalador y ZIP fueron cargados correctamente.
