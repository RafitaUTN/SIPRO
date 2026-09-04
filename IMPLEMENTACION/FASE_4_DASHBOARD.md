# FASE 4 - Dashboard

## Problema inicial

El dashboard mostraba cards saturadas y un estado de conexión decorativo.

## Causa encontrada

El markup tenía cuatro cards con gradientes, sin actividad reciente y sin relación visual con la identidad del hotel.

## Archivos modificados

- `SRC/views/panelPrincipal.html`
- `SRC/js/appShell.js`
- `SRC/css/panelPrincipal.css`

## Solución

Se creó un grid responsive de cuatro métricas reales, accesos rápidos, actividad reciente limitada a cinco movimientos, identidad del Hotel El Silencio y estado de conexión basado en una consulta real a dashboard y movimientos.

## Pruebas realizadas

- `dashboard:stats` y `movimientos:list` usan datos Supabase reales.
- La carga de dashboard cambia a `Conectado` solo tras una respuesta correcta y a `Conexión degradada` al fallar.
- `npm test` y `npm run test:audit` pasan.

## Resultado

No se hardcodean métricas ni el estado de conexión. El diseño usa 4/2/1 columnas según viewport.

## Problemas pendientes

No se ha ejecutado todavía una matriz de screenshots en 1920, 1366, 1280 y 1024.

## Riesgos

El indicador de conexión depende de la carga del dashboard; no existe aún un endpoint separado de health check.
