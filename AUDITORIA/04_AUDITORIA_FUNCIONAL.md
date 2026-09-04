# Auditoría funcional

| Módulo | Funcionalidad | Esperado | Resultado | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| Login | credenciales válidas | abrir panel | abre panel local | BUG | autentica en renderer y expone passwords |
| Panel | contadores | datos reales | productos/usuarios correctos; movimientos=0 | INCOMPLETO | recorrido CDP |
| Productos | listar/filtrar | colección completa | funciona hasta límite API 1.000 | INCONSISTENTE | 1.503 BD/1.000 modelo |
| Productos | crear/editar | persistir | funciona local | CORRECTO | suite integración |
| Stock | entrada/salida | atomicidad y un movimiento | duplica y pierde actualizaciones | BUG | `DB-001`, `DB-003` |
| Usuarios | CRUD | protegido por rol | funciona, sin autorización | BUG | código + ejecución |
| Movimientos | listar/filtrar | historial completo | carga; sin paginación | INCONSISTENTE | recorrido CDP |
| Excel inventario | generar | archivo legible | código coherente; diálogo no automatizado | NO VERIFICABLE | requiere inspección manual XLSX |
| REST productos | GET | 200 | 200 | CORRECTO | prueba HTTP local |
| REST usuarios | GET | 200 | 500 | BUG | error adaptador de tabla |
| Facturas | registrar venta | flujo visible | sin UI/conexión verificable | INCOMPLETO | DDL aislado |
