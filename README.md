# SIPRO

Aplicación de escritorio para inventario, usuarios, movimientos de stock y reportes del Hotel El Silencio del Campo. Usa Electron Forge, Supabase Auth, PostgreSQL con RLS y ExcelJS.

## Estado

- Versión actual: `1.2.1`.
- Renderer aislado: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Acceso a datos solo mediante IPC permitido y validado.
- Autenticación con Supabase Auth; no se almacenan contraseñas en tablas de la aplicación.
- Permisos en dos capas: sesión/IPC y RLS en PostgreSQL.
- Objetos de base aislados con prefijo `sipro_` para convivir con otras aplicaciones.
- Movimientos de stock atómicos mediante `sipro_ajustar_stock`.
- Instalador Windows y ZIP mediante Electron Forge.
- Publicación por tags y GitHub Releases mediante GitHub Actions.
- Keep-alive de Supabase cada seis horas mediante `.github/workflows/supabase-keepalive.yml`, validando que `SELECT 1` responda `1`.
- Icono propio en ejecutable, instalador, ventana y acceso directo de Windows.

## Desarrollo local

Requisitos: Node.js 22 o superior, npm, Docker Desktop y Git.

```powershell
npm ci
npx supabase start
npx supabase db reset --local
npm start
```

`npm start` solo admite una URL local, aprovisiona cuatro usuarios ficticios de desarrollo y luego abre Electron. Las credenciales locales se documentan en `memoria.md`; no sirven en producción.

## Pruebas

```powershell
npm test
npm run test:integration
npm run make
```

Las pruebas de integración se niegan a ejecutarse si `SUPABASE_URL` no es localhost. Antes de ejecutarlas, exporta al proceso las claves que devuelve `npx supabase status -o env`.

## Base de datos

- Migración: `supabase/migrations/20260903193354_recovered_schema.sql`
- Datos de demostración versionados: `supabase/migrations/20260904061438_seed_sipro_demo_data.sql`
- Endurecimiento posterior al asesor: `supabase/migrations/20260904070203_harden_sipro_advisor_findings.sql`
- Función administrativa: `supabase/functions/sipro-admin-users`

El esquema incluye productos, categorías, perfiles SIPRO y movimientos. La facturación recuperada se mantiene fuera del producto hasta definir reglas fiscales y de negocio.

La versión distribuible lleva únicamente la URL y la clave publicable del proyecto `mopgfccvkfyhccvzxmoe`. Los archivos `.env` se reservan para desarrollo y no pueden cambiar el destino de una aplicación empaquetada.

Nunca se debe incluir `SUPABASE_SERVICE_ROLE_KEY` en Electron, Git ni el instalador. El cliente distribuido utiliza únicamente la URL y la clave pública/publishable; RLS es la frontera de autorización.

## Publicación y actualizaciones

La configuración de Forge y el actualizador apuntan a `RafitaUTN/SIPRO`. Un tag `vMAJOR.MINOR.PATCH` activa `.github/workflows/release.yml`, que ejecuta pruebas, genera los artefactos y publica el release.

```powershell
git tag v1.2.0
git push origin v1.2.0
```

El servicio público de actualización de Electron requiere que los releases sean accesibles públicamente. Si el código fuente debe permanecer privado, debe usarse un repositorio/canal público separado exclusivamente para binarios firmados.

El workflow de keep-alive utiliza las variables públicas de repositorio `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; no necesita ni admite la clave `service_role`.

## Documentación

- Auditoría integral: `AUDITORIA/REPORTE_COMPLETO.md`
- Plan de reconstrucción: `PLAN_RECONSTRUCCION_SIPRO.md`
- Memoria viva del proyecto: `memoria.md`
- Publicación: `documentacion/ACTUALIZACIONES.md`
