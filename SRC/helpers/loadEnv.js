const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carga variables de entorno buscando en desarrollo y en app empaquetada
const loadEnv = () => {
  const candidates = [
    path.join(process.cwd(), '.env'), // habitual en desarrollo
    path.join(__dirname, '..', '..', '.env'), // raíz del proyecto
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null // app empaquetada
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
  }

  console.warn('[env] No se encontró archivo .env en rutas conocidas.');
  return null;
};

module.exports = { loadEnv };