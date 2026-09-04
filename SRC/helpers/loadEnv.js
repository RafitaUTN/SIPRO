const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Estos son identificadores públicos de cliente protegidos por RLS.
// Nunca debe añadirse aquí una clave service_role.
const packagedDefaults = {
  SUPABASE_URL: 'https://mopgfccvkfyhccvzxmoe.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_KTvfJw4am1rlxdKzsY9GVQ_-_S8JEGL'
};

const applyPackagedDefaults = () => {
  Object.entries(packagedDefaults).forEach(([key, value]) => {
    if (!process.env[key]) process.env[key] = value;
  });
};

// Carga variables de entorno buscando en desarrollo y en app empaquetada
const loadEnv = () => {
  const packaged = Boolean(
    process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'app.asar'))
  );
  const candidates = packaged
    ? [path.join(process.resourcesPath, '.env')]
    : [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '..', '..', '.env')
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      applyPackagedDefaults();
      return candidate;
    }
  }

  applyPackagedDefaults();
  return null;
};

module.exports = { loadEnv };
