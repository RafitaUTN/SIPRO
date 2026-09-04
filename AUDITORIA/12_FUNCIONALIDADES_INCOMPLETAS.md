# Funcionalidades incompletas

- Autorización por roles: comentario “por ahora mostramos todo”.
- Contador de movimientos diarios: valor fijo `0`.
- Ingresos por mes: función retorna `[]`.
- Facturación: DDL/trigger presente en `script.txt`, sin interfaz ni modelo.
- Preload/contextBridge: archivo creado pero no integrado.
- API REST: usuarios falla y productos no soporta el esquema completo.
- Logout: cierra toda la aplicación; validar si debe volver al login.
- Auto-updater: implementado con `update-electron-app` y GitHub Releases; falta validar el flujo real contra una instalación anterior publicada.

Facturas, roles y semántica de logout son `REQUIERE_VALIDACIÓN_DE_NEGOCIO`.
