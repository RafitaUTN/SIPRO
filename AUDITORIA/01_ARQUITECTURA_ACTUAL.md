# Arquitectura actual

## Procesos

- **Main Electron:** `SRC/index.js`; ventana, menú, navegación, DNS, updater, diálogos y exportación.
- **Renderer:** cinco HTML y cinco controladores JS; tiene Node completo y consulta modelos directamente.
- **Preload:** existe, pero no está configurado; `window.electronAPI` fue `undefined` en ejecución.
- **Datos:** cuatro clientes Supabase independientes en modelos/helpers; PostgREST/Data API.
- **Servidor alternativo:** `server.js` Express no es iniciado por ningún script ni por Electron.

```text
renderer privilegiado ──┬── require(modelos) ──> Supabase Data API
                        └── ipcRenderer ───────> Electron main ──> filesystem/diálogos
Express (aislado) ──> adaptador pseudo-SQL ──> Supabase Data API
```

No hay separación efectiva UI/negocio/repositorio/autorización. `ARCH-001` propone una migración incremental: primero IPC mínimo y validado; luego mover operaciones privilegiadas fuera del renderer, sin reescribir todo.
