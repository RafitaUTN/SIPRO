const session = JSON.parse(sessionStorage.getItem('siproSession') || 'null');
const content = document.getElementById('appContent');
const title = document.getElementById('viewTitle');
const eyebrow = document.getElementById('viewEyebrow');
const dashboardTemplate = document.querySelector('.dashboard-view');
const titles = { dashboard: ['Resumen', 'Panel de control'], 'productos.html': ['Inventario', 'Gestión de productos'], 'usuarios.html': ['Administración', 'Gestión de usuarios'], 'registro.html': ['Inventario', 'Movimientos de stock'], reportes: ['Análisis', 'Reportes'] };

function showError(message) { if (typeof window.mostrarToast === 'function') window.mostrarToast(message, 'danger', 'Error'); }
function setActive(view) { document.querySelectorAll('[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === view)); const [small, large] = titles[view] || ['SIPRO', 'Módulo']; eyebrow.textContent = small; title.textContent = large; }
function removeRestrictedItems() { document.querySelectorAll('[data-permission]').forEach(node => { if (!session?.permisos?.includes(node.dataset.permission)) node.remove(); }); }

async function showReports() {
   content.innerHTML = `<section class="module-view"><div class="page-intro"><div><p>Exporta información actual del sistema para análisis y respaldo.</p></div></div><div class="report-grid"><article class="surface-card report-card"><i data-lucide="package" class="report-icon" aria-hidden="true"></i><h3>Inventario general</h3><p>Productos, categorías, precios y stock actual.</p><button class="btn btn-primary report-action" data-report="inventory"><i data-lucide="download" aria-hidden="true"></i> Exportar inventario</button></article><article class="surface-card report-card"><i data-lucide="arrow-left-right" class="report-icon" aria-hidden="true"></i><h3>Movimientos</h3><p>Historial de entradas y salidas registradas.</p><button class="btn btn-primary report-action" data-report="movements"><i data-lucide="history" aria-hidden="true"></i> Abrir movimientos</button></article></div><div id="reportStatus" class="inline-status" aria-live="polite"></div></section>`;
  content.querySelector('[data-report="inventory"]').addEventListener('click', async event => { event.currentTarget.disabled = true; try { const file = await window.electronAPI.exportarInventario(); if (file) showExportSuccess(file); } catch (error) { console.error('[Reports][exportInventory]', error); showError('No fue posible generar el reporte de inventario.'); } finally { event.currentTarget.disabled = false; } });
  content.querySelector('[data-report="movements"]').addEventListener('click', () => showView('registro.html'));
}
function showExportSuccess(filePath) { const name = filePath.split(/[\\/]/).pop(); SiproUI.openModal({ title: 'Reporte generado', subtitle: 'El archivo se creó correctamente', icon: 'circle-check', content: `<div class="file-card"><div class="file-icon"><i data-lucide="file-spreadsheet" aria-hidden="true"></i></div><div class="file-info"><div class="file-name">${escapeHtml(name)}</div><div class="file-path">${escapeHtml(filePath)}</div></div></div>` }); const modal = document.querySelector('.modal-overlay'); const footer = modal.querySelector('.modal-footer'); const close = footer.querySelector('[data-modal-close]'); const open = document.createElement('button'); open.className = 'btn btn-primary'; open.innerHTML = '<i data-lucide="external-link" aria-hidden="true"></i> Abrir archivo'; open.onclick = () => window.electronAPI.openReportFile(filePath).catch(error => showError(error.message)); const folder = document.createElement('button'); folder.className = 'btn-ghost'; folder.innerHTML = '<i data-lucide="folder-open" aria-hidden="true"></i> Mostrar carpeta'; folder.onclick = () => window.electronAPI.showReportInFolder(filePath).catch(error => showError(error.message)); footer.insertBefore(open, close); footer.insertBefore(folder, close); window.lucide?.createIcons({ root: modal }); }

async function showView(view) {
  if (view !== 'productos.html') window.__siproProductScannerCleanup?.();
  content.classList.toggle('dashboard-background', view === 'dashboard');
  setActive(view);
  if (view === 'dashboard') { content.replaceChildren(dashboardTemplate); window.lucide?.createIcons(); await loadDashboard(); content.focus(); return; }
  if (view === 'reportes') { await showReports(); window.lucide?.createIcons(); content.focus(); return; }
  content.innerHTML = '<div class="view-loading" role="status">Cargando módulo...</div>';
  try {
    const html = await window.electronAPI.loadView(view);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.querySelector('.container, .dashboard-card');
    if (!root) throw new Error('La vista no tiene un contenedor válido');
    root.querySelectorAll('aside, nav').forEach(node => node.remove());
    document.querySelectorAll('[data-view-script]').forEach(node => node.remove());
    content.replaceChildren(root);
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => { if (!link.href.includes('panelPrincipal.css') && !document.querySelector(`[data-view-style="${link.getAttribute('href')}"]`)) { const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = link.getAttribute('href'); style.dataset.viewStyle = link.getAttribute('href'); document.head.appendChild(style); } });
    for (const script of doc.querySelectorAll('script[src]')) { if (/bootstrap|notificaciones/.test(script.src)) continue; const node = document.createElement('script'); node.src = script.getAttribute('src'); node.dataset.viewScript = view; document.body.appendChild(node); }
    window.lucide?.createIcons({ root }); content.focus();
  } catch (error) { console.error(`[${view}][load]`, error); content.innerHTML = '<div class="error-state"><i data-lucide="circle-alert" aria-hidden="true"></i><h2>No fue posible cargar este módulo</h2><p>Comprueba la conexión con la base de datos e inténtalo de nuevo.</p><button class="btn btn-primary" id="retryView">Reintentar</button></div>'; window.lucide?.createIcons({ root: content }); document.getElementById('retryView').addEventListener('click', () => showView(view)); showError('No fue posible cargar el módulo.'); }
}

async function loadDashboard() { try { const stats = await window.electronAPI.getDashboardStats(); Object.entries(stats).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = String(value); }); const rows = await window.electronAPI.getMovimientos({ page: 1, pageSize: 5 }); const list = document.getElementById('recentActivity'); list.replaceChildren(); if (!rows.data.length) list.innerHTML = '<div class="empty-state">No hay actividad reciente.</div>'; rows.data.forEach(row => { const item = document.createElement('div'); item.className = 'activity-item'; item.innerHTML = `<span class="activity-dot ${row.tipo_movimiento === 'entrada' ? 'entry' : 'exit'}"></span><div><strong>${row.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'} de stock</strong><span>${row.cantidad} unidad(es) de ${escapeHtml(row.producto)}</span></div><time>${new Date(row.fecha).toLocaleDateString()}</time>`; list.appendChild(item); }); setConnection('connected'); } catch (error) { console.error('[Dashboard][load]', error); setConnection('degraded'); showError('No fue posible cargar los indicadores del dashboard.'); } }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
function setConnection(state) { const node = document.getElementById('connectionState'); const labels = { connected: 'Conectado', degraded: 'Conexión degradada' }; node.className = `connection-state ${state}`; node.lastChild.textContent = ` ${labels[state] || 'Sin conexión'}`; }
async function logout() { sessionStorage.removeItem('siproSession'); await window.electronAPI.logout(); }

window.showView = showView;
window.showExportSuccess = showExportSuccess;
document.addEventListener('click', event => { const trigger = event.target.closest('[data-view]'); if (trigger) { event.preventDefault(); showView(trigger.dataset.view); } });
document.getElementById('logoutButton').addEventListener('click', logout);
if (!session) window.location.href = 'index.html'; else { document.getElementById('accountName').textContent = session.nombre || session.email; document.getElementById('accountRole').textContent = session.rol || 'Usuario'; const initials = (session.nombre || session.email || 'U').split(/\s+/).map(value => value[0]).join('').slice(0, 2).toUpperCase(); document.getElementById('accountAvatar').textContent = initials; document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }); removeRestrictedItems(); window.lucide?.createIcons(); loadDashboard(); }
