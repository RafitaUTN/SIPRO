module.exports = {
  packagerConfig: {
    name: 'SIPRO',
    executableName: 'SIPRO',
    asar: true,
    icon: './SRC/assets/icononuevo',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'SIPRO'
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
