# FASE 0 - Baseline

## Problema inicial

SIPRO arrancaba como varias vistas HTML independientes. El dashboard usaba un degradado morado, las vistas internas tenían fondos fotográficos y el toast de login mostraba `Mensaje de error` antes de que existiera un error. El inventario podía mostrar `No se pudo cargar el inventario` aunque Supabase local estuviera disponible.

## Causa encontrada

El workspace no contiene repositorio Git (`git status` devuelve `not a git repository`). Tampoco había una plantilla HTML ni capturas adicionales almacenadas en el proyecto; la referencia visual disponible es la compartida en la conversación.

El archivo `.env` apunta a un proyecto remoto. El arranque normal ejecutaba `electron-forge start` sin cargar el entorno local ni inyectar la clave local de servicio. `scripts/start-audit.ps1` ya contenía la lógica correcta, pero no era el comando predeterminado.

## Archivos modificados

- `package.json`
- `scripts/start-audit.ps1`
- `SRC/views/index.html`
- `SRC/js/login.js`
- `SRC/helpers/notificaciones.js`
- Vistas, modelos e IPC documentados en las fases siguientes.

## Solución

El comando `npm start` usa ahora `scripts/start-audit.ps1`, que exige URL local, obtiene la clave de servicio desde `supabase status -o env` y arranca Electron Forge. El comando `npm run start:electron` queda disponible para arrancar Forge sin preparar el entorno local.

## Pruebas realizadas

- `git status --short --branch`: no hay repositorio Git local.
- `docker info`: Docker Server `29.6.2` operativo.
- `npx supabase status`: API local en `http://127.0.0.1:54321`.
- `npm test`: 4/4 pruebas pasan.
- `npm run test:audit`: 4/4 pruebas pasan.

## Resultado

Baseline reproducible y sin acceso accidental a producción mediante `npm start`.

## Problemas pendientes

- No se pudo guardar screenshot baseline porque no hay capturas/plantilla local y la aplicación aún no se ha validado visualmente mediante Playwright.
- El workspace no tiene Git inicializado, por lo que no es posible crear rama ni commits.

## Riesgos

`.env` contiene configuración remota. No se usa mediante `npm start`, pero debe mantenerse fuera del renderer y fuera de cualquier paquete distribuido.
