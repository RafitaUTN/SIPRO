# FASE 3 - Design system

## Problema inicial

Había degradados morados, fondos fotográficos, cards sobredimensionadas, reglas duplicadas y estilos diferentes por vista.

## Causa encontrada

`panelPrincipal.css`, `CRUDPRODUCTOS.css`, `CRUDUSUARIO.CSS` y `registro.css` definían fondos, animaciones y dimensiones incompatibles.

## Archivos modificados

- `SRC/css/panelPrincipal.css`
- `SRC/css/CRUDPRODUCTOS.css`
- `SRC/css/CRUDUSUARIO.CSS`
- `SRC/css/registro.css`
- `SRC/views/panelPrincipal.html`

## Solución

Se centralizaron tokens de color, superficies, radios, sombras y ancho del sidebar. La aplicación usa fondo crema, navegación verde bosque, acento terracota, superficies blancas y layout responsive. Las vistas internas ya no muestran fotografías detrás de tablas.

## Pruebas realizadas

- Revisión estática de CSS y HTML.
- Pruebas de seguridad existentes pasan.

## Resultado

Dashboard y módulos comparten identidad visual y no dependen de fuentes o recursos externos.

## Problemas pendientes

Falta captura automatizada por resolución y revisión de contraste completa.

## Riesgos

Las hojas históricas aún contienen reglas antiguas que se sobreescriben mediante reglas de integración; una limpieza posterior reducirá deuda técnica.
