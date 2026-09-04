# Escalabilidad

| Escala | Comportamiento esperado con diseño actual |
| --- | --- |
| 100 registros | usable; polling y descargas redundantes |
| 1.000 | límite máximo de respuesta alcanzado |
| 10.000 | 90% puede quedar invisible; filtros incompletos |
| 100.000 | listados/exportaciones no viables en memoria/transferencia |
| millones históricos | movimientos y exportación requieren paginación, índices y agregados |

Aplicar paginación server-side (cursor por `id` o `fecha,id`), búsqueda server-side, conteos `head/count` y reportes agregados/RPC. OFFSET es aceptable para volúmenes modestos; cursor es preferible para historial creciente.
