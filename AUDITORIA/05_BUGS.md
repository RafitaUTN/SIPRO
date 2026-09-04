# Bugs confirmados

- `DB-001`: cada cambio explícito de stock puede registrar dos movimientos.
- `DB-003`: carrera y actualización perdida en stock.
- `DB-002`: stock negativo aceptado por BD.
- `BUG-001`: rutas de usuarios de Express fallan; escrituras de producto no satisfacen el esquema.
- `BUG-002`: `notificaciones.js` se carga con rutas/tipo incorrectos; `mostrarToast` no existe en panel.
- `FUNC-001`: movimientos de hoy permanece en cero.
- `PERF-001`: colecciones mayores de 1.000 quedan truncadas silenciosamente.

Pasos y causas se detallan en `INVENTARIO_HALLAZGOS.md`.
