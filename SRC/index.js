//  IMPORTACIONES

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const squirrelStartup = require('electron-squirrel-startup');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const { fileURLToPath } = require('url');

// 🔹 Importar modelos PostgreSQL
const usuarioModel = require('./db/usuarioModel');
const productoModel = require('./db/productoModel');
const { exportarProductosExcel } = require('./db/exportExcel');
const { getAllMovimientos, exportarExcelMovimientos } = require('./db/registroModel');

// 🔹 Importar auto-updater
const { checkForUpdates, getUpdateStatus, installUpdate } = require('./helpers/autoUpdater');

let mainWindow;
let currentSession = null;
let activeOperations = 0;
let lastUserActivity = Date.now();
let idleInstallTimer = null;
const UPDATE_IDLE_MS = 2 * 60 * 1000;
const exportFolder = path.join(app.getPath('documents'), 'Reportes');
const generatedExportFiles = new Set();

// Asegura que exista la carpeta destino para los Excel
const ensureExportFolder = () => {
  if (!fs.existsSync(exportFolder)) {
    fs.mkdirSync(exportFolder, { recursive: true });
  }
};

// Formatea un timestamp para usar en nombres de archivos de Excel
const buildTimestampedName = (baseName) => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${baseName}_${stamp}.xlsx`;
};

// FUNCIÓN PARA CREAR VENTANA PRINCIPAL EN PANTALLA COMPLETA
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'views/index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  Menu.setApplicationMenu(null);
};

// FUNCIÓN PARA VERIFICAR CONEXIÓN A INTERNET
const verificarConexionInternet = () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!(err && err.code === "ENOTFOUND"));
    });
  });
};
const PERMISSIONS = {
  admin: ['usuarios:read', 'usuarios:write', 'productos:read', 'productos:write', 'productos:delete', 'stock:write', 'movimientos:read', 'reportes:read', 'updates:read'],
  encargado: ['productos:read', 'productos:write', 'stock:write', 'movimientos:read', 'reportes:read', 'updates:read'],
  inventario: ['productos:read', 'productos:write', 'stock:write', 'movimientos:read', 'reportes:read', 'updates:read'],
  consulta: ['productos:read', 'movimientos:read', 'reportes:read', 'updates:read']
};
const requirePermission = (permission) => {
  if (!currentSession || !currentSession.permisos.includes(permission)) throw new Error('No autorizado');
};

const assertTrustedSender = (event) => {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || !senderUrl.startsWith('file://')) throw new Error('Origen IPC no autorizado');
  const senderPath = path.resolve(fileURLToPath(senderUrl));
  const viewsRoot = `${path.resolve(__dirname, 'views')}${path.sep}`;
  if (!senderPath.startsWith(viewsRoot)) throw new Error('Origen IPC no autorizado');
};

const secureHandle = (channel, handler) => ipcMain.handle(channel, async (event, ...args) => {
  assertTrustedSender(event);
  activeOperations += 1;
  try {
    return await handler(event, ...args);
  } finally {
    activeOperations = Math.max(0, activeOperations - 1);
  }
});

const scheduleIdleInstall = () => {
  lastUserActivity = Date.now();
  if (idleInstallTimer) clearInterval(idleInstallTimer);
  idleInstallTimer = setInterval(() => {
    const windowBusy = !mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame();
    if (!windowBusy && activeOperations === 0 && Date.now() - lastUserActivity >= UPDATE_IDLE_MS) {
      clearInterval(idleInstallTimer);
      idleInstallTimer = null;
      installUpdate();
    }
  }, 15_000);
};

secureHandle('auth:login', async (_event, { email, password }) => {
  const user = await usuarioModel.validarLogin(email, password);
  if (!user) return null;
  currentSession = { ...user, permisos: PERMISSIONS[user.rol] || [], expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  return currentSession;
});
secureHandle('auth:session', () => currentSession && currentSession.expiresAt > Date.now() ? currentSession : null);
secureHandle('auth:logout', async () => { currentSession = null; await usuarioModel.cerrarSesion(); await mainWindow.loadFile(path.join(__dirname, 'views/index.html')); return true; });
secureHandle('views:load', async (_event, view) => {
  const allowedViews = new Set(['productos.html', 'usuarios.html', 'registro.html']);
  if (!allowedViews.has(view)) throw new Error('Vista no permitida');
  const filePath = path.join(__dirname, 'views', view);
  return fs.promises.readFile(filePath, 'utf8');
});
secureHandle('dashboard:stats', async () => { requirePermission('reportes:read'); return productoModel.getDashboardStats(); });
secureHandle('productos:list', async (_event, options) => { requirePermission('productos:read'); return productoModel.getAllProductos(options); });
secureHandle('productos:by-barcode', async (_event, codigo) => { requirePermission('productos:read'); if (typeof codigo !== 'string' || codigo.trim().length < 1 || codigo.length > 100) throw new Error('Código de barras inválido'); return productoModel.getProductoByCodigo(codigo.trim()); });
secureHandle('categorias:list', async () => { requirePermission('productos:read'); return productoModel.getAllCategorias(); });
secureHandle('productos:create', async (_e, p) => { requirePermission('productos:write'); return productoModel.createProducto(p); });
secureHandle('productos:update', async (_e, { id, producto }) => { requirePermission('productos:write'); return productoModel.updateProducto(id, producto); });
secureHandle('productos:delete', async (_e, id) => { requirePermission('productos:delete'); return productoModel.deleteProductoDesvincular(id); });
secureHandle('stock:entrada', async (_e, { id, cantidad }) => { requirePermission('stock:write'); return productoModel.entradaProducto(id, cantidad); });
secureHandle('stock:salida', async (_e, { id, cantidad }) => { requirePermission('stock:write'); return productoModel.salidaProducto(id, cantidad); });
secureHandle('usuarios:list', async (_event, options) => { requirePermission('usuarios:read'); return usuarioModel.getAllUsuarios(options); });
secureHandle('usuarios:create', async (_e, u) => { requirePermission('usuarios:write'); return usuarioModel.createUsuario(u); });
secureHandle('usuarios:update', async (_e, { id, usuario }) => { requirePermission('usuarios:write'); return usuarioModel.updateUsuario(id, usuario); });
secureHandle('usuarios:delete', async (_e, id) => { requirePermission('usuarios:write'); return usuarioModel.deleteUsuario(id); });
secureHandle('movimientos:list', async (_event, options) => { requirePermission('movimientos:read'); return getAllMovimientos(options); });
secureHandle('updates:status', () => { requirePermission('updates:read'); return getUpdateStatus(); });
secureHandle('updates:install', () => { requirePermission('updates:read'); return installUpdate(); });
secureHandle('updates:later', () => { requirePermission('updates:read'); scheduleIdleInstall(); return { scheduled: true, idleMinutes: UPDATE_IDLE_MS / 60_000 }; });
secureHandle('updates:activity', () => { requirePermission('updates:read'); lastUserActivity = Date.now(); return true; });

secureHandle('exportar-inventario', async () => {
  requirePermission('reportes:read');
  try {
    ensureExportFolder();
    // Pedir al usuario dónde guardar
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Excel de Inventario',
      defaultPath: path.join(exportFolder, buildTimestampedName('Inventario')),
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (canceled || !filePath) return null; // usuario canceló

    // Generar el Excel usando la ruta elegida
    await exportarProductosExcel(filePath);

    generatedExportFiles.add(path.resolve(filePath));
    return filePath;
  } catch (err) {
    console.error('Error generando Excel:', err);
    throw err;
  }
});

secureHandle('exportar-movimiento', async (event, movimientosFiltrados) => {
  requirePermission('reportes:read');
  try {
    ensureExportFolder();
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Excel de movimientos',
      defaultPath: path.join(exportFolder, buildTimestampedName('Movimientos')),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return null;
    await exportarExcelMovimientos(filePath, movimientosFiltrados);
    generatedExportFiles.add(path.resolve(filePath));
    return filePath;
  } catch (err) {
    console.error(err);
    throw err;
  }
});

// INICIALIZACIÓN DE LA APP
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});

if (!squirrelStartup) app.whenReady().then(async () => {
  app.setAppUserModelId('com.hotelsilencio.sipro');
  const hayInternet = await verificarConexionInternet();
  if (!hayInternet) {
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Sin conexión a Internet',
      message: 'No se detectó conexión a Internet en este dispositivo, por favor verifica que tengas conexión.',
    });
  }
  createMainWindow();

  // 🔹 Verificar actualizaciones
  checkForUpdates({
    onUpdateReady: status => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updates:ready', status);
    }
  });
});

const isGeneratedExport = (filePath) => typeof filePath === 'string' && generatedExportFiles.has(path.resolve(filePath));
secureHandle('reports:open-file', async (_event, filePath) => { requirePermission('reportes:read'); if (!isGeneratedExport(filePath)) throw new Error('Archivo de reporte no autorizado'); return shell.openPath(filePath); });
secureHandle('reports:show-in-folder', (_event, filePath) => { requirePermission('reportes:read'); if (!isGeneratedExport(filePath)) throw new Error('Archivo de reporte no autorizado'); shell.showItemInFolder(filePath); return true; });
