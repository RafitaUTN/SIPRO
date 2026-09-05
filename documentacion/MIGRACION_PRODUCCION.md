# Migración segura de SIPRO a Supabase de producción

## Estado comprobado del respaldo

El archivo local `BD_SUPABASE_PRODUCCION/db_cluster-02-09-2026@22-25-47.backup` es un volcado SQL de PostgreSQL en texto plano. No debe abrirse con `pg_restore`; se restaura con `psql` en un entorno aislado.

El análisis local, sin imprimir correos ni contraseñas, encontró:

- 16 categorías.
- 565 productos.
- 8.773 movimientos: 2.307 entradas y 6.466 salidas.
- 4 perfiles en `public.usuarios` y 8 identidades en `auth.users`.
- 0 códigos de barras duplicados.
- 0 productos sin categoría.
- 0 movimientos huérfanos.
- 0 cantidades inválidas y 0 existencias negativas.

El respaldo también contiene datos sensibles de `auth`, `storage` y `vault`. Por eso está excluido mediante `.gitignore` y nunca debe subirse a un repositorio ni adjuntarse a un release.

Las contraseñas de la tabla antigua no tienen un formato moderno reconocible. No se copiarán. Cada usuario recibirá una contraseña temporal fuerte generada durante la migración y deberá cambiarla.

## Decisión de arquitectura

Cambiar únicamente `.env` no es suficiente ni seguro. La aplicación actual usa tablas aisladas con prefijo `sipro_`, Supabase Auth, RLS y funciones atómicas de inventario. La base antigua usa otra estructura y permisos demasiado amplios.

La migración conserva las tablas antiguas sin modificaciones, crea los objetos nuevos `sipro_*`, copia y valida el inventario dentro de una transacción, y recién después permite cambiar la configuración de la aplicación. Ante cualquier problema, se puede volver a la configuración anterior porque los datos originales permanecen intactos.

## Procedimiento de ejecución

1. Generar un respaldo nuevo e inmutable de producción y calcular su SHA-256.
2. Restaurar ese respaldo en un proyecto Supabase temporal o PostgreSQL aislado. Nunca ensayar primero sobre producción.
3. Aplicar, en este orden, solo estas migraciones de esquema:
   - `supabase/migrations/20260903193354_recovered_schema.sql`
   - `supabase/migrations/20260904070203_harden_sipro_advisor_findings.sql`
   - `supabase/migrations/20260731062642_create_keepalive_function.sql`
   - `supabase/migrations/20260904084451_harden_keepalive_function.sql`
4. No aplicar la carga de demostración `20260904061438_seed_sipro_demo_data.sql` ni la migración específica del proyecto de pruebas `20260904081213_isolate_sipro_auth_profiles.sql`.
5. Ejecutar `documentacion/sql/migrar_inventario_legacy.sql`. El script se cancela si falta una tabla, si el destino ya contiene datos o si no coinciden totales, precios o existencias.
6. Ejecutar `documentacion/sql/validar_migracion_produccion.sql`. Todos los recuentos y diferencias deben quedar en cero donde corresponda.
7. Probar la migración de usuarios en seco:

   ```powershell
   $env:SUPABASE_URL='https://PROYECTO.supabase.co'
   $env:SUPABASE_SERVICE_ROLE_KEY='CLAVE_SERVICE_ROLE_TEMPORAL'
   $env:SIPRO_EXPECTED_PROJECT_REF='PROYECTO'
   node scripts/migrate-production-users.js
   ```

8. Si la simulación informa cero conflictos y cero perfiles SIPRO existentes, aplicar una única vez:

   ```powershell
   $env:SIPRO_MIGRATION_CONFIRM='MIGRAR_USUARIOS_PRODUCCION'
   node scripts/migrate-production-users.js --apply
   ```

   El resultado se guarda en `CREDENCIALES_PRODUCCION.md`, que está ignorado por Git. La service role nunca se incorpora a Electron, GitHub, un release ni un archivo `.env` distribuido.
9. Desplegar y probar la función administrativa `sipro-admin-users`; validar creación, edición y eliminación de un usuario temporal.
10. Ejecutar las pruebas RLS, concurrencia, interfaz y aplicación empaquetada contra el proyecto migrado.
11. Solo con aceptación funcional, cambiar la URL y clave publicable de producción, reconstruir la aplicación y configurar los workflows.

## Respaldo lógico automatizado en GitHub Actions

El workflow `.github/workflows/database-backup.yml` exporta cada día las cuatro tablas funcionales `sipro_*` mediante la API autenticada, valida que no disminuyan respecto a la línea base, calcula sus sumas, cifra el archivo con AES-256 y carga únicamente el artefacto cifrado. GitHub elimina automáticamente los artefactos después de 14 días. Este respaldo protege los datos de SIPRO; no sustituye un volcado PostgreSQL completo de roles, Auth, Storage y esquema.

Requiere estos secretos del repositorio:

- `SIPRO_BACKUP_EMAIL`: cuenta administrativa SIPRO usada solo para lectura durante el respaldo.
- `SIPRO_BACKUP_PASSWORD`: contraseña de esa cuenta.
- `BACKUP_ENCRYPTION_PASSWORD`: frase aleatoria de al menos 32 caracteres, conservada también fuera de GitHub.

El keep-alive y el respaldo usan las variables `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` apuntadas a producción. Ambos workflows deben probarse manualmente antes de depender de sus horarios.

## Datos requeridos antes de tocar producción

- Referencia exacta del proyecto Supabase de producción y acceso a él.
- URL pública y clave publicable.
- Service role entregada solo de forma temporal para migrar Auth y desplegar la función.
- Contraseña independiente para cifrar respaldos.

No se ejecutará ninguna escritura remota ni se publicará una versión hasta completar primero el ensayo aislado y obtener todos los resultados en verde.
