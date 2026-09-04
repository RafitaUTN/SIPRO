# FASE 7 - Movimientos

## Problema inicial

Movimientos cargaba todo el historial y aplicaba filtros en memoria. No diferenciaba visualmente entrada y salida.

## Causa encontrada

El IPC no recibía filtros ni paginación y el modelo no aplicaba rangos.

## Archivos modificados

- `SRC/db/registroModel.js`
- `SRC/index.js`
- `SRC/preload.js`
- `SRC/js/registro.js`
- `SRC/views/registro.html`

## Solución

Se añadieron filtros de producto, categoría, tipo y rango de fechas, paginación server-side, validación de fechas, debounce y badges accesibles para entradas/salidas.

## Pruebas realizadas

Consulta local real: 2 movimientos, una página. Sintaxis y pruebas de auditoría pasan.

## Resultado

Historial filtrable y paginado sin descargar todo el historial.

## Problemas pendientes

El modelo actual no contiene usuario responsable, por lo que no se añadió una columna ficticia.

## Riesgos

La exportación histórica recibe las filas actualmente cargadas; debe ampliarse para exportar todos los resultados filtrados sin romper paginación.
