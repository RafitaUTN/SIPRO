# FASE 1 - Supabase local

## Problema inicial

El entorno de desarrollo podía cargar credenciales remotas y no garantizaba la clave local requerida por las operaciones protegidas.

## Causa encontrada

`SRC/db/supabaseClient.js` usa `@supabase/supabase-js`. Si la URL es local, selecciona `SUPABASE_SERVICE_ROLE_KEY`; esa variable solo era inyectada por `scripts/start-audit.ps1` y `scripts/start-direct.ps1`. `npm start` no ejecutaba ninguno de los dos scripts.

## Archivos modificados

- `package.json`
- `scripts/start-audit.ps1`

## Solución

El arranque de desarrollo predeterminado exige la configuración local y no acepta una URL que no sea `localhost` o `127.0.0.1`. La service role queda únicamente en el proceso principal y no se expone mediante preload.

## Pruebas realizadas

- Docker operativo: versión `29.6.2`.
- Supabase local operativo: API `http://127.0.0.1:54321`, DB `127.0.0.1:54322`.
- Lectura real mediante `SRC/db/supabaseClient.js`: tabla `productos`, 3 registros.
- Escritura controlada: crear producto temporal, leerlo, eliminarlo y confirmar limpieza; resultado exitoso, ID temporal `4`.
- `npm test`: 4/4.
- `npm run test:audit`: 4/4.

## Resultado

La BD local, migraciones, seed y cliente Supabase son utilizables por SIPRO. El fallo anterior era de selección de entorno, no de tabla, esquema, CORS ni disponibilidad del contenedor.

## Problemas pendientes

- La autenticación de SIPRO sigue siendo propia sobre `usuarios`, no Supabase Auth.
- Studio y servicios secundarios aparecen detenidos, pero REST y Postgres necesarios para SIPRO funcionan.

## Riesgos

No ejecutar `npm run start:electron` sin preparar variables locales; para desarrollo debe usarse `npm start`.
