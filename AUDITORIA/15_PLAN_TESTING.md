# Plan de testing

## P0

- Tests XSS para productos, usuarios, movimientos y toast.
- Tests de aislamiento: `require` ausente, preload allowlist, validación de sender IPC.
- Auth: login/logout/expiración/rol/IDOR y políticas RLS como `anon`, `authenticated` y usuarios distintos.

## P1

- RPC/transacción de entrada/salida: stock límite, rollback, 20-100 operaciones concurrentes.
- Un solo movimiento por cambio; eliminación con historial y fallo inducido.
- Constraints de cantidades, roles, precios, FK e índices.

## P2

- Paginación con 1k/10k/50k/100k; búsqueda y fechas.
- XLSX: contenido, tipos, fórmula injection y archivo grande.
- Electron E2E con Playwright Electron o CDP, elegido tras aislar renderer.

Cada corrección exige: test rojo, cambio mínimo, test verde, suite completa y evidencia en `20_RESULTADOS_PRUEBAS.md`.
