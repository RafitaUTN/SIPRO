# FASE 5 - Productos

## Problema inicial

Productos descargaba toda la colección y filtraba en el renderer. El formulario dependía principalmente de placeholders.

## Causa encontrada

`productos:list` no aceptaba parámetros y `CRUDPRODUCTO.js` mantenía la colección completa en memoria.

## Archivos modificados

- `SRC/db/productoModel.js`
- `SRC/index.js`
- `SRC/preload.js`
- `SRC/js/CRUDPRODUCTO.js`
- `SRC/views/productos.html`

## Solución

Se añadió paginación real con `range`, conteo exacto, búsqueda de nombre/código/categoría, filtro de categoría, debounce de 300 ms y estados vacíos. El CRUD y las operaciones atómicas de stock se conservaron.

## Pruebas realizadas

Consulta local real: 2 filas de página, 3 totales y 2 páginas. Escritura controlada creada, leída y eliminada correctamente.

## Resultado

CRUD real y paginado sobre Supabase local.

## Problemas pendientes

Falta prueba E2E visual y validación contextual inline completa.

## Riesgos

La búsqueda por categoría usa una consulta previa de IDs para mantener compatibilidad con PostgREST.
