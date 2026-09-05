const session = JSON.parse(sessionStorage.getItem('siproSession') || 'null');
const content = document.getElementById('appContent');
const title = document.getElementById('viewTitle');
const eyebrow = document.getElementById('viewEyebrow');
const dashboardTemplate = document.querySelector('.dashboard-view');
const titles = { dashboard: ['Resumen', 'Panel de control'], 'productos.html': ['Inventario', 'Gestión de productos'], 'usuarios.html': ['Administración', 'Gestión de usuarios'], 'registro.html': ['Inventario', 'Movimientos de stock'], reportes: ['Análisis', 'Reportes'] };
const viewCache = new Map();
let currentView = 'dashboard';
let navigationId = 0;
let updateModalVisible = false;
let lastActivityReport = 0;

function showError(message) { if (typeof window.mostrarToast === 'function') window.mostrarToast(message, 'danger', 'No fue posible completar la acción'); }
function setActive(view) { document.querySelectorAll('[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === view)); const [small, large] = titles[view] || ['SIPRO', 'Módulo']; eyebrow.textContent = small; title.textContent = large; }
function removeRestrictedItems() { document.querySelectorAll('[data-permission]').forEach(node => { if (!session?.permisos?.includes(node.dataset.permission)) node.remove(); }); }

async function showReports() {
  content.innerHTML = `<section class="module-view"><div class="page-intro"><div><p>Exporta información actual del sistema para análisis y respaldo.</p></div></div><div class="report-grid"><article class="surface-card report-card"><i data-lucide="package" class="report-icon" aria-hidden="true"></i><h3>Inventario general</h3><p>Productos, categorías, precios y stock actual.</p><button class="btn btn-primary report-action" data-report="inventory"><i data-lucide="download" aria-hidden="true"></i> Exportar inventario</button></article><article class="surface-card report-card"><i data-lucide="arrow-left-right" class="report-icon" aria-hidden="true"></i><h3>Movimientos</h3><p>Historial de entradas y salidas registradas.</p><button class="btn btn-primary report-action" data-report="movements"><i data-lucide="history" aria-hidden="true"></i> Abrir movimientos</button></article></div><div id="reportStatus" class="inline-status" aria-live="polite"></div></section>`;
  content.querySelector('[data-report="inventory"]').addEventListener('click', async event => { event.currentTarget.disabled = true; try { const file = await window.electronAPI.exportarInventario(); if (file) showExportSuccess(file); } catch (error) { console.error('[Reports][exportInventory]', error); showError('No fue posible generar el reporte de inventario.'); } finally { event.currentTarget.disabled = false; } });
  content.querySelector('[data-report="movements"]').addEventListener('click', () => showView('registro.html'));
}

function showExportSuccess(filePath) { const name = filePath.split(/[\\/]/).pop(); SiproUI.openModal({ title: 'Reporte generado', subtitle: 'El archivo se creó correctamente', icon: 'circle-check', content: `<div class="file-card"><div class="file-icon"><i data-lucide="file-spreadsheet" aria-hidden="true"></i></div><div class="file-info"><div class="file-name">${escapeHtml(name)}</div><div class="file-path">${escapeHtml(filePath)}</div></div></div>` }); const modal = document.querySelector('.modal-overlay'); const footer = modal.querySelector('.modal-footer'); const close = footer.querySelector('[data-modal-close]'); const open = document.createElement('button'); open.className = 'btn btn-primary'; open.innerHTML = '<i data-lucide="external-link" aria-hidden="true"></i> Abrir archivo'; open.onclick = () => window.electronAPI.openReportFile(filePath).catch(showError); const folder = document.createElement('button'); folder.className = 'btn-ghost'; folder.innerHTML = '<i data-lucide="folder-open" aria-hidden="true"></i> Mostrar carpeta'; folder.onclick = () => window.electronAPI.showReportInFolder(filePath).catch(showError); footer.insertBefore(open, close); footer.insertBefore(folder, close); window.lucide?.createIcons({ root: modal }); }

function ensureStyles(doc) {
  const styles = [...doc.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => link.getAttribute('href'))
    .filter(href => href && !href.includes('panelPrincipal.css') && !href.includes('vendor.css'));
  return Promise.all(styles.map(href => new Promise((resolve, reject) => {
    const existing = document.querySelector(`[data-view-style="${href}"]`);
    if (existing) return resolve();
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    style.dataset.viewStyle = href;
    style.addEventListener('load', resolve, { once: true });
    style.addEventListener('error', () => reject(new Error('No se pudo preparar el diseño del módulo.')), { once: true });
    document.head.appendChild(style);
  })));
}

async function installViewScripts(doc, view) {
  document.querySelectorAll('[data-view-script]').forEach(node => node.remove());
  for (const script of doc.querySelectorAll('script[src]')) {
    if (/bootstrap|notificaciones|lucide/.test(script.src)) continue;
    await new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = script.getAttribute('src');
      node.dataset.viewScript = view;
      node.addEventListener('load', resolve, { once: true });
      node.addEventListener('error', () => reject(new Error('No se pudo iniciar el módulo.')), { once: true });
      document.body.appendChild(node);
    });
  }
}

async function showView(view) {
  if (view === currentView && !content.classList.contains('is-view-loading')) return;
  const requestedNavigation = ++navigationId;
  const previousView = currentView;
  setActive(view);
  content.classList.add('is-view-loading');
  content.setAttribute('aria-busy', 'true');

  try {
    if (view === 'dashboard') {
      window.__siproProductScannerCleanup?.();
      document.querySelectorAll('[data-view-script]').forEach(node => node.remove());
      content.replaceChildren(dashboardTemplate);
      currentView = view;
      content.classList.add('dashboard-background');
      window.lucide?.createIcons({ root: content });
      await loadDashboard();
    } else if (view === 'reportes') {
      window.__siproProductScannerCleanup?.();
      document.querySelectorAll('[data-view-script]').forEach(node => node.remove());
      content.classList.remove('dashboard-background');
      await showReports();
      currentView = view;
      window.lucide?.createIcons({ root: content });
    } else {
      const html = viewCache.get(view) || await window.electronAPI.loadView(view);
      viewCache.set(view, html);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const root = doc.querySelector('.container, .dashboard-card');
      if (!root) throw new Error('La vista no tiene un contenedor válido');
      root.querySelectorAll('aside, nav').forEach(node => node.remove());
      await ensureStyles(doc);
      if (requestedNavigation !== navigationId) return;
      window.__siproProductScannerCleanup?.();
      content.classList.remove('dashboard-background');
      content.replaceChildren(root);
      await installViewScripts(doc, view);
      currentView = view;
      window.lucide?.createIcons({ root: content });
    }
    content.focus({ preventScroll: true });
  } catch (error) {
    console.error(`[${view}][load]`, error);
    setActive(previousView);
    showError('No fue posible abrir el módulo. La pantalla anterior permanece disponible; inténtalo nuevamente.');
  } finally {
    if (requestedNavigation === navigationId) {
      content.classList.remove('is-view-loading');
      content.removeAttribute('aria-busy');
    }
  }
}

async function loadDashboard() { try { const stats = await window.electronAPI.getDashboardStats(); Object.entries(stats).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = String(value); }); const rows = await window.electronAPI.getMovimientos({ page: 1, pageSize: 5 }); const list = document.getElementById('recentActivity'); list.replaceChildren(); if (!rows.data.length) list.innerHTML = '<div class="empty-state">No hay actividad reciente.</div>'; rows.data.forEach(row => { const item = document.createElement('div'); item.className = 'activity-item'; item.innerHTML = `<span class="activity-dot ${row.tipo_movimiento === 'entrada' ? 'entry' : 'exit'}"></span><div><strong>${row.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'} de stock</strong><span>${row.cantidad} unidad(es) de ${escapeHtml(row.producto)}</span></div><time>${new Date(row.fecha).toLocaleDateString()}</time>`; list.appendChild(item); }); setConnection('connected'); } catch (error) { console.error('[Dashboard][load]', error); setConnection('degraded'); showError('No fue posible cargar los indicadores del panel. Revisa la conexión e inténtalo nuevamente.'); } }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
function setConnection(state) { const node = document.getElementById('connectionState'); const labels = { connected: 'Conectado', degraded: 'Conexión degradada' }; node.className = `connection-state ${state}`; node.lastChild.textContent = ` ${labels[state] || 'Sin conexión'}`; }
async function logout() { sessionStorage.removeItem('siproSession'); await window.electronAPI.logout(); }

function buildUpdateContent(version) {
  const wrapper = document.createElement('div');
  wrapper.className = 'update-ready-content';
  const logo = document.createElement('img');
  logo.src = '../assets/logo hotel.png';
  logo.alt = 'Hotel El Silencio del Campo';
  logo.className = 'update-brand-logo';
  const message = document.createElement('p');
  message.textContent = `La versión ${version} ya se descargó y está lista. Puedes instalarla ahora o continuar trabajando.`;
  const detail = document.createElement('p');
  detail.className = 'update-idle-note';
  detail.textContent = 'Si eliges “Más tarde”, SIPRO esperará a que no haya actividad ni operaciones en curso para actualizarse automáticamente.';
  wrapper.append(logo, message, detail);
  return wrapper;
}

function showUpdateModal(status) {
  if (!status?.ready || updateModalVisible) return;
  if (document.body.classList.contains('modal-open')) {
    setTimeout(() => showUpdateModal(status), 1_000);
    return;
  }
  updateModalVisible = true;
  let installing = false;
  SiproUI.openModal({
    title: 'Actualización lista',
    subtitle: `Nueva versión ${status.version}`,
    icon: 'download',
    content: buildUpdateContent(status.version),
    submitLabel: 'Instalar ahora',
    cancelLabel: 'Más tarde',
    closeOnBackdrop: false,
    onSubmit: async overlay => {
      installing = true;
      const button = overlay.querySelector('[data-modal-submit]');
      button.disabled = true;
      button.textContent = 'Reiniciando SIPRO...';
      const started = await window.electronAPI.installUpdate();
      if (!started) {
        installing = false;
        button.disabled = false;
        button.textContent = 'Instalar ahora';
        showError('La actualización todavía no está lista. Inténtalo nuevamente en unos segundos.');
      }
    },
    onClose: async reason => {
      updateModalVisible = false;
      if (!installing && reason === 'replaced') {
        setTimeout(() => showUpdateModal(status), 1_000);
      } else if (!installing) {
        await window.electronAPI.postponeUpdate();
        mostrarToast('La actualización se instalará automáticamente cuando el sistema lleve dos minutos sin actividad.', 'info', 'Actualización pendiente');
      }
    }
  });
}

function reportUserActivity() {
  const now = Date.now();
  if (now - lastActivityReport < 10_000) return;
  lastActivityReport = now;
  window.electronAPI.reportActivity().catch(() => {});
}

window.showView = showView;
window.showExportSuccess = showExportSuccess;
document.addEventListener('click', event => { const trigger = event.target.closest('[data-view]'); if (trigger) { event.preventDefault(); showView(trigger.dataset.view); } });
['pointerdown', 'keydown', 'input'].forEach(eventName => document.addEventListener(eventName, reportUserActivity, { passive: true }));
document.getElementById('logoutButton').addEventListener('click', logout);

if (!session) {
  window.location.href = 'index.html';
} else {
  document.getElementById('accountName').textContent = session.nombre || session.email;
  document.getElementById('accountRole').textContent = session.rol || 'Usuario';
  const initials = (session.nombre || session.email || 'U').split(/\s+/).map(value => value[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('accountAvatar').textContent = initials;
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
  removeRestrictedItems();
  window.lucide?.createIcons();
  loadDashboard();
  window.electronAPI.onUpdateReady(showUpdateModal);
  window.electronAPI.getUpdateStatus().then(showUpdateModal).catch(error => console.error('[Updates][status]', error));
}
