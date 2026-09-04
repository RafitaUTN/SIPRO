# Rendimiento

- 1.503 filas ordenadas en PostgreSQL tardaron ~0,5 ms localmente: la BD pequeña no es el cuello de botella actual.
- El modelo recibió 1.000 por el límite de PostgREST: el problema es corrección/payload, no tiempo SQL.
- Dashboard vuelve a descargar productos y usuarios completos cada 30 s.
- Exportación anida todos los movimientos por producto y agrega en JavaScript.
- Listados y filtros se ejecutan íntegramente en renderer.
- Cuatro módulos crean clientes Supabase separados.

Medir después de implementar paginación y agregados server-side. No se justifican microservicios.
