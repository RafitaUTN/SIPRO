# Código muerto o no conectado

- `SRC/preload.js`: nunca asignado a `webPreferences.preload`.
- `server.js` y `SRC/db/db.js`: no tienen script npm ni import desde Electron.
- `productoModel.getIngresosPorMes`: retorna vacío.
- `getProductosConVentas` y `getProductosInventario`: duplican `getAllProductos` y no tienen consumidores encontrados.
- `hasMovimientos`, `deleteProducto`, `usuarioModel.validarLogin/getUsuarioById`: sin llamadas desde flujos actuales.
- `productosData` e IPC `actualizar-productos`: se escribe pero nunca se lee.
- imports `os`, `ExcelJS` en main y `path/app` en updater: sin uso.
- tablas `facturas`/`detalle_factura`: sin consultas desde aplicación.

No se eliminó nada. Confirmar objetivos de facturación y servidor antes de limpiar.
