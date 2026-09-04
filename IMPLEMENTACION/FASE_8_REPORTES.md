# FASE 8 - Reportes

## Problema inicial

La exportación estaba disponible como tarjeta del dashboard, no como módulo persistente del sistema.

## Causa encontrada

Existían handlers `exportar-inventario` y `exportar-movimiento` y ExcelJS, pero no una vista de reportes dedicada.

## Archivos modificados

- `SRC/views/panelPrincipal.html`
- `SRC/js/appShell.js`

## Solución

Se añadió Reportes al sidebar y un módulo real dentro del app shell. Inventario general usa el handler existente y Movimientos abre el módulo filtrable existente.

## Pruebas realizadas

Se verificó la existencia y uso de ExcelJS y los handlers IPC. Las pruebas de seguridad pasan.

## Resultado

Reportes es navegable sin recargar la ventana.

## Problemas pendientes

Falta agregar variantes dedicadas de stock bajo, entradas y salidas con exportación completa de filtros.

## Riesgos

No marcar esta fase como totalmente verificada hasta ejecutar una exportación real desde Electron.
