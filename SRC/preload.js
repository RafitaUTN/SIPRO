const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  getSession: () => ipcRenderer.invoke('auth:session'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  loadView: (view) => ipcRenderer.invoke('views:load', view),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats'),
  getProductos: (options) => ipcRenderer.invoke('productos:list', options),
  getProductoByCodigo: (codigo) => ipcRenderer.invoke('productos:by-barcode', codigo),
  getCategorias: () => ipcRenderer.invoke('categorias:list'),
  createProducto: (producto) => ipcRenderer.invoke('productos:create', producto),
  updateProducto: (id, producto) => ipcRenderer.invoke('productos:update', { id, producto }),
  deleteProducto: (id) => ipcRenderer.invoke('productos:delete', id),
  entradaProducto: (id, cantidad) => ipcRenderer.invoke('stock:entrada', { id, cantidad }),
  salidaProducto: (id, cantidad) => ipcRenderer.invoke('stock:salida', { id, cantidad }),
  getUsuarios: (options) => ipcRenderer.invoke('usuarios:list', options),
  createUsuario: (usuario) => ipcRenderer.invoke('usuarios:create', usuario),
  updateUsuario: (id, usuario) => ipcRenderer.invoke('usuarios:update', { id, usuario }),
  deleteUsuario: (id) => ipcRenderer.invoke('usuarios:delete', id),
  getMovimientos: (options) => ipcRenderer.invoke('movimientos:list', options),
  exportarInventario: () => ipcRenderer.invoke('exportar-inventario'),
  exportarMovimientos: (movimientos) => ipcRenderer.invoke('exportar-movimiento', movimientos),
  openReportFile: (filePath) => ipcRenderer.invoke('reports:open-file', filePath),
  showReportInFolder: (filePath) => ipcRenderer.invoke('reports:show-in-folder', filePath)
});
