# Seguridad Electron

| Control | Estado | Evidencia |
| --- | --- | --- |
| contextIsolation | deshabilitado | `SRC/index.js:65` |
| nodeIntegration | habilitado | `SRC/index.js:64`; confirmado dinámicamente |
| sandbox | no configurado/efectivamente no aislado | webPreferences |
| preload | no cargado | `window.electronAPI === undefined` |
| CSP | ausente | vistas HTML |
| contenido remoto | Bootstrap CDN | cinco vistas |
| IPC sender validation | ausente | handlers globales |
| navegación/window open | sin políticas | main process |
| DevTools | no restringidas | configuración por defecto |

Cadena demostrada: dato malicioso en BD -> `innerHTML` -> JavaScript renderer -> `require` Node. Prioridad P0. La solución debe hacerse en dos pasos seguros: neutralizar sinks XSS con `textContent`; después activar aislamiento/sandbox y sustituir llamadas directas por una API preload mínima con validación de sender y payload.
