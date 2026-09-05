const { app, autoUpdater } = require('electron');
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');

let checkStarted = false;
let readyUpdate = null;
let installStarted = false;

function normalizarVersion(info = {}) {
  const source = [info.releaseName, info.updateURL].filter(Boolean).join(' ');
  return source.match(/v?(\d+\.\d+\.\d+)/i)?.[1] || 'nueva';
}

function getUpdateStatus() {
  return readyUpdate ? { ready: true, version: readyUpdate.version } : { ready: false };
}

function installUpdate() {
  if (!readyUpdate || installStarted) return false;
  installStarted = true;
  setImmediate(() => autoUpdater.quitAndInstall());
  return true;
}

function checkForUpdates({ onUpdateReady } = {}) {
  if (checkStarted || !app.isPackaged) return;
  checkStarted = true;

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'RafitaUTN/SIPRO'
    },
    notifyUser: true,
    onNotifyUser: info => {
      readyUpdate = { version: normalizarVersion(info) };
      onUpdateReady?.(getUpdateStatus());
    }
  });
}

module.exports = { checkForUpdates, getUpdateStatus, installUpdate };
