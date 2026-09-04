# Dependencias

Inventario directo: 11 runtime originales, 11 desarrollo tras añadir Supabase CLI. Árbol auditado: 787 paquetes según npm.

`npm audit`: 40 avisos (1 crítico, 35 altos, 3 moderados, 1 bajo). Producción declarada: 13 paquetes afectados; Electron es devDependency pero constituye el runtime distribuido, por lo que no debe excluirse del análisis.

Prioridad de evaluación: Electron 36.9.5, electron-updater 6.6.2, cadenas Forge/tar, `ws`, Express/body-parser/path-to-regexp y ExcelJS/uuid. No se ejecutó `npm audit fix`.

Posiblemente innecesarias/desconectadas: `electron-prompt`, `electron-reload`, `concurrently`, `electron-builder`, makers deb/rpm, Express/CORS/body-parser si se retira `server.js`. `electron-installer-common` y `word-wrap` aparecen extraneous.

Existe mezcla Forge 6.4.2 con publisher GitHub 7.11.2. Actualizar por lotes pequeños con prueba de arranque y empaquetado en cada lote.
