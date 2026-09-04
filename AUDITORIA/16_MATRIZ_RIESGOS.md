# Matriz de riesgos

| ID | Problema | Probabilidad | Impacto | Severidad | Prioridad |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | XSS + Node | Alta | Crítico | CRÍTICO | P0 |
| SEC-002 | passwords expuestos | Alta | Crítico | CRÍTICO | P0 |
| AUTH-001 | sin autorización | Alta | Crítico | CRÍTICO | P0 |
| SEC-003 | admin hardcodeado | Alta | Crítico | CRÍTICO | P0 |
| SEC-004 | anon/RLS y env empaquetado | Alta | Alto | ALTO | P0 |
| SEC-005 | CDN en renderer privilegiado | Media | Crítico | ALTO | P0 |
| DB-001 | movimientos duplicados | Alta | Alto | ALTO | P1 |
| DB-003 | carrera de stock | Media | Alto | ALTO | P1 |
| DB-004 | borrado parcial | Media | Alto | ALTO | P1 |
| PERF-001 | truncamiento a 1.000 | Alta | Alto | ALTO | P1 |
| DEP-001 | runtime vulnerable | Media | Alto | ALTO | P1 |
| BUG-001 | REST roto/inseguro | Media | Alto | ALTO | P1 |
| TEST-001 | sin red de regresión original | Alta | Alto | ALTO | P1 |

Los riesgos medios/bajos constan en `INVENTARIO_HALLAZGOS.md`.
