# Resultados de pruebas

| Fecha | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- |
| 2026-09-03 | Docker/Supabase start | PASA | DB/API sanos |
| 2026-09-03 | integración modelos | 5/5 PASA | SEC-002, DB-001/2/3 reproducidos |
| 2026-09-03 | Electron start | PASA CON ERRORES | login y módulos cargan; errores renderer |
| 2026-09-03 | XSS almacenado | VULNERABLE | payload ficticio ejecutó JS |
| 2026-09-03 | Node renderer | VULNERABLE | `typeof require=function` |
| 2026-09-03 | sesión | VULNERABLE | password completo almacenado |
| 2026-09-03 | REST productos | PASA | HTTP 200 |
| 2026-09-03 | REST usuarios | FALLA | HTTP 500, tabla no detectada |
| 2026-09-03 | REST CORS | VULNERABLE | origen `*`, mutaciones permitidas |
| 2026-09-03 | 1.503 productos | FALLA | modelo devuelve 1.000 |
| 2026-09-03 | npm audit | FALLA | 40 avisos |

Errores renderer exactos: `SyntaxError: Unexpected token 'export'` al cargar helper como script clásico, dos `ERR_FILE_NOT_FOUND` para `SRC/views/helpers/notificaciones.js` y el 404 deliberado del payload XSS.
