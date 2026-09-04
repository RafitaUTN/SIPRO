const path = require('node:path');

module.exports = {
  packagerConfig: {
    name: 'SIPRO',
    executableName: 'SIPRO',
    asar: true,
    icon: './SRC/assets/favicon.ico',
    ignore: [
      /^\/\.env(?:\..*)?$/,
      /^\/CREDENCIALES_ACCESO\.md$/,
      /^\/(?:\.git|\.github|AUDITORIA|IMPLEMENTACION|documentacion|scripts|supabase|tests)(?:\/|$)/,
      /^\/(?:memoria\.md|PLAN_RECONSTRUCCION_SIPRO\.md)$/
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'SIPRO',
        setupIcon: path.resolve(__dirname, 'SRC/assets/favicon.ico'),
        iconUrl: 'https://raw.githubusercontent.com/RafitaUTN/SIPRO/main/SRC/assets/favicon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: { owner: 'RafitaUTN', name: 'SIPRO' },
        prerelease: false,
        draft: false
      }
    }
  ]
};
