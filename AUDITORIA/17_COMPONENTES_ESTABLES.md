# Componentes estables

- Navegación básica de una ventana y carga de las cinco vistas: verificada localmente.
- Consultas activas Supabase usan API estructurada y filtros `.eq`, evitando concatenación SQL de usuario.
- Unicidad de email/código/categoría y precio no negativo: verificados en DDL.
- Relaciones producto-categoría y movimiento-producto se recuperan correctamente por PostgREST.
- El historial puede representar producto eliminado mediante FK nullable y texto preservado.
- Generadores Excel tienen estructura clara, encabezados, autofiltro, congelación y rutas elegidas por diálogo.
- `loadEnv` localiza recursos en desarrollo/empaquetado de forma comprensible.
- Mensajes de UI usan `textContent` en el toast de login, que es seguro para ese flujo concreto.

Preservar estos comportamientos con tests antes de cambios adyacentes.
