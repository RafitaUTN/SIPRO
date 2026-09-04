const session = JSON.parse(sessionStorage.getItem('siproSession') || 'null');

function mostrarToast(mensaje, tipo = 'info') {
  const node = document.createElement('div');
  node.className = `toast text-bg-${tipo}`;
  node.textContent = mensaje;
  document.querySelector('.toast-container')?.appendChild(node);
  setTimeout(() => node.remove(), 4000);
}

function configurarVistaPorRol() {
  if (!session) return window.location.href = 'index.html';
  if (!session.permisos.includes('usuarios:read')) document.querySelectorAll('[data-page="usuarios.html"]').forEach(node => node.remove());
}

window.cerrarSesion = async () => { sessionStorage.removeItem('siproSession'); await window.electronAPI.logout(); };
window.irA = (pagina) => { window.location.href = pagina; };
window.generarExcel = async () => {
  try { const ruta = await window.electronAPI.exportarInventario(); if (ruta) mostrarToast(`Archivo generado en: ${ruta}`, 'success'); }
  catch (error) { console.error('[export]', error.message); mostrarToast('No se pudo generar el reporte', 'danger'); }
};

document.getElementById('logoutButton').addEventListener('click', window.cerrarSesion);
document.querySelectorAll('[data-page]').forEach(card => card.addEventListener('click', () => window.irA(card.dataset.page)));
document.getElementById('exportButton').addEventListener('click', window.generarExcel);
document.getElementById('sidebarExport')?.addEventListener('click', window.generarExcel);

window.addEventListener('DOMContentLoaded', async () => {
  configurarVistaPorRol();
  try {
    const stats = await window.electronAPI.getDashboardStats();
    for (const [id, value] of Object.entries({ totalProductos: stats.totalProductos, totalUsuarios: stats.totalUsuarios, stockBajo: stats.stockBajo, totalMovimientos: stats.totalMovimientos })) {
      document.getElementById(id).textContent = String(value);
    }
  } catch (error) { console.error('[dashboard]', error.message); }
});
