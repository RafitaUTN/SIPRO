# Modelo de datos

| Entidad | Clave y relaciones | Restricciones observadas |
| --- | --- | --- |
| usuarios | PK id | email UNIQUE; campos obligatorios; rol sin CHECK; password texto |
| categorias | PK id | nombre UNIQUE NOT NULL |
| productos | PK id; FK categoria_id | código UNIQUE; precio >= 0; stock sin CHECK |
| movimientos_stock | PK id; FK producto_id nullable | tipo/cantidad sin CHECK; fecha sin zona |
| facturas | PK id; FK usuario_id nullable | sin consumidor en código |
| detalle_factura | PK id; FK factura/producto | cantidad/precio sin CHECK |

Índices existentes: PK y UNIQUE. Faltan índices explícitos sobre FKs y búsquedas/orden temporal (`producto_id`, `fecha`, `categoria_id`, `factura_id`, `usuario_id`).

El DDL recuperado usa `app.*`; el cliente `.from()` usa `public`. `script.txt` y `documentacion/ScripBD.txt` tampoco representan el mismo estado final del trigger. El entorno local usa `public` para reproducir el contrato ejecutable y no pretende afirmar cuál es el esquema remoto.
