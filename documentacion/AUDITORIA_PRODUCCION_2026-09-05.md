# Auditoría e integración de Supabase de producción

Fecha: 2026-09-05 UTC
Proyecto: `ndrcwqcqtymcjhkcscdp` (`hotelelsilenciodelcampo`)
PostgreSQL: 17.6.1.063
Estado inicial: `ACTIVE_HEALTHY`

## Respaldo previo

Antes de escribir se generó el respaldo lógico local:

- `BD_SUPABASE_PRODUCCION/sipro-public-2026-09-05T02-56-52-205Z.json`
- Tamaño: 1.641.929 bytes.
- SHA-256: `ce929cd819270bd003f2ce9be7bf039fb2dfba522faf2349e42cda569e4a5ea5`.
- Verificación de lectura y checksum: correcta.
- Contenido: 16 categorías, 565 productos, 8.934 movimientos y 4 usuarios heredados.

El archivo contiene datos sensibles, permanece ignorado por Git y complementa el respaldo completo anterior del 2 de septiembre. Auth y Storage estaban vacíos antes de la integración.

El acceso conectado a Codex no entrega la contraseña PostgreSQL para un dump completo. Como protección operativa adicional, GitHub genera un respaldo lógico cifrado de las cuatro tablas funcionales mediante la API autenticada. Este artefacto no contiene contraseñas ni sustituye el respaldo completo del clúster.

## Hallazgos iniciales

- Las tablas heredadas `usuarios`, `categorias`, `productos` y `movimientos_stock` tenían RLS desactivado.
- `anon` y `authenticated` tenían permisos completos, incluidos `DELETE`, `UPDATE` y `TRUNCATE`.
- No existían políticas RLS, funciones públicas, Edge Functions ni migraciones registradas.
- Las cuatro contraseñas estaban almacenadas en texto plano y tenían entre 7 y 10 caracteres.
- No había usuarios en Supabase Auth ni archivos en Storage.
- Integridad del inventario: cero códigos duplicados, productos sin categoría, movimientos huérfanos, cantidades inválidas, precios negativos o existencias negativas.

Las tablas heredadas no se bloquearon porque hacerlo rompería inmediatamente cualquier instalación antigua que todavía las utilice. Deben considerarse solo para compatibilidad y recuperación hasta confirmar que todos los equipos usan SIPRO 1.2.2; después se podrá retirar su acceso anónimo sin borrar datos.

## Integración aplicada

- Se creó un esquema paralelo `sipro_*`; las tablas heredadas no se eliminaron, renombraron ni actualizaron.
- Se copiaron 16 categorías, 565 productos y 8.934 movimientos preservando identificadores, precios, existencias y fechas.
- Se verificaron cero diferencias y cero huérfanos después de la copia.
- Se habilitó RLS y autorización por `app_metadata` sobre todas las tablas nuevas.
- Las operaciones de stock se realizan mediante RPC atómicas con validación interna de rol.
- Los cuatro usuarios heredados se migraron a Supabase Auth. Sus contraseñas actuales se convirtieron directamente a bcrypt dentro de PostgreSQL y ya no son leídas desde la tabla nueva.
- Se desplegó `sipro-admin-users` versión 1, con JWT obligatorio y `@supabase/supabase-js@2.89.0` fijado.
- Se creó `keepalive()` como `SECURITY INVOKER`; GitHub quedó apuntando a producción y su ejecución manual terminó correctamente.
- Electron y `.env` usan la URL y clave publicable de producción; nunca contienen `service_role`.

## Verificación final

- Contratos y seguridad locales: 11/11.
- `npm audit`: 0 vulnerabilidades.
- Inicio de sesión real: 4/4 usuarios migrados.
- Lectura anónima de `sipro_productos`: bloqueada.
- Lectura autenticada y recuentos: correctos.
- Creación y eliminación administrativa temporal: correctas, sin perfiles residuales.
- Keep-alive: respuesta exacta `1`.
- Electron en desarrollo contra producción: recorrido completo sin errores de renderer.
- Ejecutable empaquetado 1.2.2 contra producción: recorrido completo sin errores de renderer.
- Navegación inicial: cero muestras vacías.
- XSS almacenado: no ejecutado.
- Estado posterior: 16 categorías, 565 productos, 8.934 movimientos, 4 perfiles y 4 identidades Auth; cero productos o usuarios de prueba.
- Squirrel y ZIP 1.2.2: compilación correcta.

## Avisos que permanecen

- El asesor de seguridad continúa marcando las cuatro tablas heredadas sin RLS. Es intencional temporalmente para no interrumpir instalaciones antiguas.
- Las dos RPC de negocio son `SECURITY DEFINER` de forma intencional: revocan acceso anónimo, exigen sesión y validan el rol SIPRO antes de escribir.
- Supabase recomienda habilitar protección contra contraseñas filtradas. Las claves heredadas deben cambiarse por claves únicas de al menos 12 caracteres.
- Los avisos de índices no usados son informativos en un esquema recién creado; no deben eliminarse antes de acumular tráfico real.

## Seguimiento posterior a la publicación

1. Conservar fuera de GitHub la copia de `BACKUP_ENCRYPTION_PASSWORD` necesaria para restaurar los artefactos.
2. Confirmar que ya no se necesita la versión antigua antes de retirar permisos anónimos de las tablas heredadas.
3. Obtener una conexión PostgreSQL solo si se requiere además un volcado completo de roles, Auth, Storage y esquema.
