# Plan de reconstruccion SIPRO

Fecha: 2026-09-03

## Mapa de estado reproducible

| Area | Estado actual | Decisión/estado objetivo | Puede hacerse sin Supabase remoto |
| --- | --- | --- | --- |
| Runtime | Electron Forge 6; `electron-builder` esta instalado pero no configurado | Mantener Electron Forge + Squirrel/zip; eliminar builder extraneo | Si |
| Renderer | `nodeIntegration` activo, `contextIsolation` desactivado, modelos directos | Preload con allowlist IPC y renderer sin Node | Si |
| Seguridad web | CDN Bootstrap/icons, CSP inexistente, varios `innerHTML` con datos | Assets locales, CSP y DOM seguro | Si |
| Autenticacion | Comparación de password en cliente y admin fijo | Servicio confiable, DTO sin secretos, roles y primer arranque | Si con mock/local; Auth real queda pendiente |
| Datos | Cliente Supabase duplicado, trigger + modelo duplican movimientos | Cliente unico, RPC atomicas y constraints | Si con Supabase local/mocks |
| API | `server.js` solo se auto-consume y no tiene referencias externas encontradas | No es parte del runtime de escritorio; retirar o proteger antes de exponer | Si |
| Reportes | Excel funcional pero carga relaciones completas | Consultas agregadas/paginadas | Parcial |
| Facturacion | Solo DDL recuperado en `script.txt`, sin UI/modelo | Mantener fuera de UI hasta definir negocio; diseñar fase posterior | Si |
| Actualizaciones | Forge publica; `update-electron-app` verifica e instala desde GitHub Releases | Squirrel-Windows, prompt de reinicio, sin secretos empaquetados | Si, excepto prueba contra release |
| Pruebas | Solo caracterización de vulnerabilidades actuales; no existe `npm test` | Unitarias, seguridad, integración local y E2E básica | Si |

## Hallazgos priorizados

| Prioridad | Hallazgos |
| --- | --- |
| P0 | SEC-001 XSS/RCE, SEC-002 passwords expuestos, SEC-003 credencial fija, AUTH-001 autorización inexistente, ARCH-001 Node en renderer, SEC-005 CDN/CSP |
| P1 | DB-001 movimientos duplicados, DB-003 concurrencia, DB-002/005 constraints, DB-004 borrado, SEC-004 RLS/secreto empaquetado, SEC-006 Express abierto, DEP-001 runtime vulnerable |
| P2 | PERF-001 paginación, PERF-002 exportación agregada, PERF-003 dashboard, FUNC-001/002 reportes, BUG-001/002 contratos rotos, decisión de facturación |
| P3 | DEP-002 limpieza Forge, DEAD-002 código muerto, DOC-001/ENV-001 documentación, LOG-001 logging |

## Contradicciones confirmadas

- El código usa `public.*` mediante Supabase Data API; documentación y `db.js` todavía hablan de `app.*`.
- `supabase/migrations` define `public`, mientras `documentacion/ScripBD.txt` conserva el esquema histórico `app`.
- `script.txt` contiene objetos de facturación recuperados, pero no hay consumidores en vistas, JS o modelos.
- Forge es el empaquetador y publisher configurado. `update-electron-app` es el actualizador compatible con los artefactos Squirrel-Windows publicados en GitHub Releases.
- No se encontraron consumidores del Express server en el árbol del proyecto. El runtime de escritorio no necesita API HTTP; queda como prototipo no publicable hasta que se retire o se proteja.

## Fases ejecutables

1. Contener Electron, IPC, XSS y assets offline.
2. Estabilizar autenticación local/mock con el contrato que luego implementará Supabase Auth.
3. Aplicar esquema canónico, RPC de stock y pruebas de concurrencia.
4. Completar dashboard, paginación y exportaciones; mantener facturación explícitamente fuera hasta decisión de negocio.
5. Unificar Forge/GitHub Releases, actualizar dependencias por lotes y documentar operación.
6. Ejecutar suite completa, prueba offline y checklist de producción.

## Bloqueo externo

La instancia Supabase remota no está operativa. No se deben aplicar migraciones ni rotar claves contra ella hasta recuperar acceso. Todo lo demás se valida con Supabase local, mocks y pruebas estáticas.
