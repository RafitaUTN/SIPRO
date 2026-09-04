# FASE 6 - Usuarios

## Problema inicial

El select ofrecía el rol inexistente `usuario` y la edición exigía contraseña aunque no se cambiara.

## Causa encontrada

La UI no correspondía con `ROLES` de `usuarioModel.js`.

## Archivos modificados

- `SRC/views/usuarios.html`
- `SRC/db/usuarioModel.js`
- `SRC/js/CRUDUSUARIO.JS`

## Solución

La UI usa `admin`, `encargado`, `inventario` y `consulta`; la contraseña solo se procesa cuando se proporciona. Se añadió paginación y búsqueda server-side, sin exponer hashes ni contraseñas.

## Pruebas realizadas

DTO seguro y hashing scrypt pasan las pruebas de auditoría. Consulta local real: 1 fila de página, 3 totales y 3 páginas.

## Resultado

Roles coherentes y listado paginado.

## Problemas pendientes

No se ha automatizado todavía un E2E de permisos por rol.

## Riesgos

La autenticación sigue siendo propia sobre la tabla `usuarios`; no es Supabase Auth.
