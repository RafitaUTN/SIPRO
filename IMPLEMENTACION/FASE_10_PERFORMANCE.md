# FASE 10 - Performance

## Problema inicial

La navegación recreaba documentos y los listados descargaban colecciones completas.

## Causa encontrada

Uso de `window.location.href` y ausencia de `range`/conteo en consultas de listado.

## Archivos modificados

- `SRC/js/appShell.js`
- `SRC/db/productoModel.js`
- `SRC/db/usuarioModel.js`
- `SRC/db/registroModel.js`
- `SRC/js/CRUDPRODUCTO.js`
- `SRC/js/CRUDUSUARIO.JS`
- `SRC/js/registro.js`

## Solución

App shell persistente, consultas paginadas y debounce de búsqueda en productos/movimientos. Dashboard limita actividad a cinco filas.

## Pruebas realizadas

Las consultas locales devuelven únicamente el tamaño de página solicitado.

## Resultado

Se eliminó la causa arquitectónica principal del retraso y la carga masiva.

## Problemas pendientes

Falta medir startup/navegación con DevTools y comparar métricas antes/después.

## Riesgos

La carga dinámica de scripts requiere más refactor para convertir módulos históricos en componentes nativos del shell.
