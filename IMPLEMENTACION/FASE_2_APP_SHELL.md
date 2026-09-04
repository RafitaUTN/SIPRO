# FASE 2 - App shell

## Problema inicial

Cada módulo navegaba con `window.location.href`, recreando la ventana y el layout completo. El sidebar no era consistente y el cierre de sesión aparecía en el contenido superior.

## Causa encontrada

Dashboard, productos, usuarios y movimientos eran documentos HTML separados. Sus scripts estaban acoplados al DOM de cada documento.

## Archivos modificados

- `SRC/views/panelPrincipal.html`
- `SRC/js/appShell.js`
- `SRC/index.js`
- `SRC/preload.js`
- `SRC/js/CRUDPRODUCTO.js`
- `SRC/js/CRUDUSUARIO.JS`
- `SRC/js/registro.js`

## Solución

`panelPrincipal.html` es ahora el shell permanente. Un handler IPC con lista blanca (`views:load`) lee únicamente las vistas permitidas y `appShell.js` reemplaza el contenido central, conserva sidebar/topbar y actualiza el estado activo. Los scripts de módulo quedaron encapsulados en IIFE para permitir volver a abrir módulos sin colisiones de variables globales.

## Pruebas realizadas

- `npm start` arranca Electron Forge con Supabase local.
- Proceso Electron permanece activo y responde.
- Sintaxis de `SRC/index.js`, `SRC/js/appShell.js` y `SRC/js/CRUDPRODUCTO.js` válida.
- `npm test`: 4/4.
- `npm run test:audit`: 4/4.

## Resultado

El layout principal ya no se reconstruye al cambiar de módulo. El sidebar incluye Panel de control, Productos, Usuarios, Movimientos, Reportes, perfil y cierre de sesión inferior.

## Problemas pendientes

Falta validar visualmente con screenshots automatizados y terminar el módulo de reportes con todas sus variantes filtradas.

## Riesgos

La carga de HTML y scripts sigue reutilizando vistas históricas; requiere una fase posterior para convertir cada módulo en componentes de contenido más pequeños.
