# Resumen ejecutivo

Estado general: **crítico en seguridad y preocupante en integridad**, con flujos básicos operativos.

| Severidad | Total |
| --- | ---: |
| CRÍTICO | 4 |
| ALTO | 11 |
| MEDIO | 9 |
| BAJO | 6 |
| MEJORA | 1 |

Los diez riesgos prioritarios son `SEC-001`, `SEC-002`, `AUTH-001`, `SEC-003`, `DB-001`, `DB-003`, `SEC-004`, `SEC-005`, `PERF-001` y `DEP-001`. La evidencia y el orden P0-P3 están en `REPORTE_COMPLETO.md` e `INVENTARIO_HALLAZGOS.md`.

La aplicación arrancó y sus módulos visibles cargaron contra Supabase local. Se verificaron como útiles el inventario, categorías, movimientos y exportaciones. No debe publicarse otra versión hasta corregir el límite de confianza del renderer, autenticación/autorización y empaquetado de `.env`.
