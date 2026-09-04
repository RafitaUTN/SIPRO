# Plan de correcciones

## P0 — contención

1. Tests rojos XSS; reemplazar sinks por nodos/textContent.
2. Configurar preload real, `contextIsolation: true`, `nodeIntegration: false`, sandbox y allowlist IPC.
3. Empaquetar Bootstrap localmente, CSP y bloqueo de navegación/permisos.
4. Diseñar auth/roles con dueño del negocio; retirar passwords y admin hardcodeado.
5. RLS/GRANT mínimos; retirar `.env` como extraResource; rotar clave distribuida al final.

## P1 — integridad

1. RPC transaccional/atómica de stock y único origen del movimiento.
2. Constraints e índices validados con pruebas.
3. Transacción o `ON DELETE SET NULL` para borrado.
4. Decidir: retirar API Express o autenticar/reparar.

## P2 — corrección y escala

Paginación, conteos, búsqueda server-side, reportes agregados, dashboard real y actualización gradual de dependencias.

## P3 — limpieza

Código/dependencias muertas, logs estructurados, documentación y convenciones. Cada etapa debe desplegarse y probarse independientemente.
