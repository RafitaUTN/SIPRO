# Actualizaciones con GitHub Releases

## Configuración previa (una sola vez)

### 1. Token de GitHub
En CI usa un secreto `GH_TOKEN` con el mínimo permiso necesario para publicar releases. No lo agregues a `.env` distribuido ni al instalador.

GitHub Actions debe ser el camino preferido. La publicación local es solo para mantenimiento y el token vive en la sesión del proceso.

### 2. Configurar variable de entorno
En tu terminal (PowerShell):

```powershell
$env:GH_TOKEN="token-solo-en-esta-sesion"
```

O agrega permanentemente en tu sistema:
```powershell
# No persistir GH_TOKEN como variable de usuario.
```

---

## Publicar una nueva versión

### Paso 1: Incrementar versión en package.json

```json
"version": "1.0.1"  // Cambia según semántica: major.minor.patch
```

### Paso 2: Compilar y generar instalador

```powershell
npm run make
```

Esto crea una carpeta `out/` con los instaladores:
- `SIPRO Setup 1.0.1.exe` (instalador Squirrel)
- `SIPRO-1.0.1-win.zip`

### Paso 3: Publicar en GitHub Releases

```powershell
npm run publish
```

O manualmente:
```powershell
npx electron-forge publish
```

Esto:
✅ Crea automáticamente un release publicado en GitHub
✅ Sube los archivos `.exe`, `.nupkg` y `RELEASES` necesarios para Squirrel-Windows
✅ Publica los artefactos y metadatos que corresponda al maker configurado

### CI recomendado

Crear un tag `vMAJOR.MINOR.PATCH` y subirlo. `.github/workflows/release.yml` instala dependencias, ejecuta pruebas, crea Squirrel/ZIP y publica usando el `GITHUB_TOKEN` efímero de Actions. No se debe ejecutar `npm run publish` desde el arranque de la aplicación.

### Verificar en GitHub

1. Ve a: https://github.com/RafitaUTN/SIPRO/releases
2. Verifica que la nueva versión esté publicada y que incluya el instalador y los artefactos Squirrel-Windows

---

## Comportamiento de auto-actualización

Cuando un usuario abre tu app:

1. **Busca actualizaciones** automáticamente
2. **Detecta una versión nueva** → muestra notificación
3. **Usuario elige**:
   - "Actualizar ahora" → descarga + instala + reinicia
   - "Más tarde" → sigue usando versión actual
4. **Descarga silenciosa** si no hace nada (en segundo plano)

---

## Solución de problemas

### La app no detecta actualizaciones
```bash
# Verificar que el actualizador esté instalado
npm ls update-electron-app

# Ver logs en consola
# Abre DevTools: Ctrl+Shift+I
```

### Error: "No se puede conectar a GitHub"
- Verifica que el publisher esté ejecutándose solo en CI/publicación y que `GH_TOKEN` tenga permisos
- Comprueba conexión a internet
- El usuario necesita internet para descargar actualizaciones

Las actualizaciones se comprueban al iniciar una aplicación empaquetada y periódicamente mientras permanece abierta. En desarrollo se omite el chequeo. Antes de producción hay que validar una instalación de la versión anterior contra un release público y confirmar el flujo descargar/reiniciar.

### ¿Cómo firmar con certificado? (Opcional, para producción)
Agrega en `.env`:
```
CERTIFICATE_FILE=C:\path\to\certificate.pfx
CERTIFICATE_PASSWORD=tu_password
```

---

## Estructura de versiones (Semantic Versioning)

```
1.0.0 = MAJOR.MINOR.PATCH

MAJOR: Cambios incompatibles (reescrituras grandes)
MINOR: Nuevas funciones (compatibles con versiones anteriores)
PATCH: Fixes y mejoras menores
```

Ejemplos:
- `1.0.0` → `1.1.0` (nueva feature)
- `1.1.0` → `1.1.1` (bug fix)
- `1.1.1` → `2.0.0` (cambio mayor)

---

## Comandos rápidos

```powershell
# Compilar localmente
npm run make

# Compilar y publicar
npm run publish

# Solo para testing (no publica)
npm run package

# Ver versión actual
npm list sipro
```

---

## Checklist antes de publicar

- [ ] Actualicé la versión en `package.json`
- [ ] Probé la app localmente (`npm start`)
- [ ] Creé el `.exe` con `npm run make`
- [ ] GH_TOKEN existe solo en el entorno de publicación
- [ ] Internet disponible
- [ ] Verifiqué los cambios en GitHub Releases

¡Listo! Tus usuarios recibirán automáticamente las actualizaciones 🎉
