const { app } = require('electron');
const { updateElectronApp, makeUserNotifier, UpdateSourceType } = require('update-electron-app');

let checkStarted = false;

function checkForUpdates() {
  if (checkStarted || !app.isPackaged) return;
  checkStarted = true;

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'RafitaUTN/SIPRO'
    },
    notifyUser: true,
    onNotifyUser: makeUserNotifier({
      title: 'Nueva versión disponible',
      detail: 'La actualización se descargará y quedará lista para instalar.',
      restartButtonText: 'Instalar ahora',
      laterButtonText: 'Más tarde'
    })
  });
}

module.exports = { checkForUpdates };
