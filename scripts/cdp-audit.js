const path = require('node:path');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.audit'), override: false });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const host = new URL(process.env.SUPABASE_URL).hostname;
const localAudit = ['127.0.0.1', 'localhost'].includes(host);
const allowedRemoteAudit = process.env.SIPRO_ALLOW_REMOTE_AUDIT === '1'
  && host === 'ndrcwqcqtymcjhkcscdp.supabase.co';
if (!localAudit && !allowedRemoteAudit) {
  throw new Error('cdp-audit solo permite Supabase local o el proyecto SIPRO autorizado explícitamente.');
}
const auditEmail = process.env.SIPRO_AUDIT_EMAIL || 'admin.local@example.invalid';
const auditPassword = process.env.SIPRO_AUDIT_PASSWORD || 'AuditOnly-Admin-123!';

async function getTarget() {
  const response = await fetch('http://127.0.0.1:9222/json/list');
  return (await response.json()).find(target => target.type === 'page');
}

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const login = await supabase.auth.signInWithPassword({ email: auditEmail, password: auditPassword });
  if (login.error) throw login.error;
  const marker = `AUD-XSS-${process.pid}-${Date.now()}`;
  const uiUserEmail = `auditoria-ui-${process.pid}-${Date.now()}@example.invalid`;
  const category = await supabase.from('sipro_categorias').select('id').limit(1).single();
  if (category.error) throw category.error;
  const injected = await supabase.rpc('sipro_crear_producto', {
    p_codigodebarra: marker,
    p_nombre: `<img src=x onerror="document.body.dataset.auditXss='${marker}'">`,
    p_precio: 1,
    // Stock cero evita crear un movimiento de auditoría que deba limpiarse después.
    p_stock: 0,
    p_categoria_id: category.data.id,
    p_stock_minimo: 1
  });
  if (injected.error) throw injected.error;

  const result = { rendererErrors: [], pages: {} };
  let socket;
  let temporaryUserId;
  try {
    const target = await getTarget();
    if (!target) throw new Error('No se encontró una página Electron en el puerto 9222.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let sequence = 0;
    const pending = new Map();
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.id && pending.has(message.id)) {
        const item = pending.get(message.id); pending.delete(message.id);
        return message.error ? item.reject(message.error) : item.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') result.rendererErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') result.rendererErrors.push(message.params.entry.text);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result.value;
    };
    const waitFor = async (expression, timeoutMs = 10000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (await evaluate(expression)) return;
        await sleep(250);
      }
      throw new Error(`Tiempo agotado esperando: ${expression}`);
    };
    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
    await send('Page.navigate', { url: new URL('index.html', target.url).href }); await sleep(1000);
    result.pages.login = await evaluate(`({ requireType: typeof require, electronApiType: typeof window.electronAPI, formPresent: Boolean(document.getElementById('loginForm')) })`);
    await evaluate(`(() => { document.getElementById('email').value=${JSON.stringify(auditEmail)}; document.getElementById('password').value=${JSON.stringify(auditPassword)}; document.getElementById('loginForm').requestSubmit(); return true; })()`);
    await waitFor(`typeof window.showView === 'function'`);
    await waitFor(`document.getElementById('totalProductos')?.textContent !== '--'`);
    result.pages.panel = await evaluate(`(() => { const intro = getComputedStyle(document.querySelector('.page-intro p')); const date = getComputedStyle(document.querySelector('.date-label')); return { url: location.href, session: JSON.parse(sessionStorage.getItem('siproSession') || 'null'), products: document.getElementById('totalProductos')?.textContent, users: document.getElementById('totalUsuarios')?.textContent, introFontSize: intro.fontSize, introColor: intro.color, dateFontSize: date.fontSize, dateColor: date.color }; })()`);
    result.pages.updateModal = await evaluate(`(async () => {
      showUpdateModal({ ready: true, version: '1.2.2-prueba' });
      await new Promise(resolve => setTimeout(resolve, 50));
      const modal = document.querySelector('.app-modal');
      const result = {
        visible: Boolean(modal),
        logo: modal?.querySelector('.update-brand-logo')?.getAttribute('src'),
        title: modal?.querySelector('#modalTitle')?.textContent,
        installButton: modal?.querySelector('[data-modal-submit]')?.textContent,
        laterButton: modal?.querySelector('[data-modal-close]:not(.modal-close)')?.textContent
      };
      modal?.querySelector('[data-modal-close]:not(.modal-close)')?.click();
      return result;
    })()`);
    result.pages.userMessage = await evaluate(`mensajeParaUsuario("Error invoking remote method 'usuarios:create': Error: La contraseña debe tener al menos 12 caracteres.")`);
    result.pages.firstNavigation = await evaluate(`(async () => {
      const target = document.getElementById('appContent');
      let samples = 0;
      let emptySamples = 0;
      const sampler = setInterval(() => {
        samples += 1;
        if (!target.textContent.trim() && target.children.length === 0) emptySamples += 1;
      }, 2);
      await window.showView('productos.html');
      clearInterval(sampler);
      return { samples, emptySamples, loadingCleared: !target.classList.contains('is-view-loading') };
    })()`);
    await waitFor(`document.querySelectorAll('#tablaProductos tbody tr').length > 0`);
    result.pages.productos = await evaluate(`({ rows: document.querySelectorAll('#tablaProductos tbody tr').length, xssExecuted: document.body.dataset.auditXss === '${marker}' })`);
    await evaluate(`window.showView('usuarios.html')`); await waitFor(`document.querySelectorAll('#tablaUsuarios tbody tr').length > 0`);
    await evaluate(`document.getElementById('newUserButton').click(); mostrarToast('Validación de posición', 'warning');`);
    await waitFor(`Boolean(document.querySelector('.app-modal') && document.querySelector('.toast'))`);
    const notificationLayout = await evaluate(`(() => { const modal = document.querySelector('.app-modal').getBoundingClientRect(); const toast = document.querySelector('.toast-container').getBoundingClientRect(); return { modalZ: getComputedStyle(document.querySelector('.modal-overlay')).zIndex, toastZ: getComputedStyle(document.querySelector('.toast-container')).zIndex, sideBySide: toast.right <= modal.left || toast.left >= modal.right, viewportWidth: innerWidth }; })()`);
    await evaluate(`(() => { document.getElementById('nombreUsuario').value='Usuario temporal UI'; document.getElementById('emailUsuario').value=${JSON.stringify(uiUserEmail)}; document.getElementById('passwordUsuario').value='Temporal!Sipro-UI-2026'; document.getElementById('rolUsuario').value='consulta'; document.getElementById('formUsuario').requestSubmit(); return true; })()`);
    await waitFor(`!document.querySelector('.app-modal') && document.body.textContent.includes(${JSON.stringify(uiUserEmail)})`);
    const createdProfile = await supabase.from('sipro_usuarios').select('id').eq('email', uiUserEmail).single();
    if (createdProfile.error) throw createdProfile.error;
    temporaryUserId = createdProfile.data.id;
    result.pages.usuarios = await evaluate(`({ rows: document.querySelectorAll('#tablaUsuarios tbody tr').length, userCreated: document.body.textContent.includes(${JSON.stringify(uiUserEmail)}), notificationLayout: ${JSON.stringify(notificationLayout)} })`);
    await evaluate(`window.showView('registro.html')`); await waitFor(`document.querySelectorAll('#tablaMovimientos tbody tr').length > 0`);
    result.pages.movimientos = await evaluate(`({ rows: document.querySelectorAll('#tablaMovimientos tbody tr').length })`);
  } finally {
    socket?.close();
    if (!temporaryUserId) {
      const lookup = await supabase.from('sipro_usuarios').select('id').eq('email', uiUserEmail).maybeSingle();
      temporaryUserId = lookup.data?.id;
    }
    if (temporaryUserId) await supabase.functions.invoke('sipro-admin-users', { body: { action: 'delete', id: temporaryUserId } });
    await supabase.from('sipro_movimientos_stock').delete().eq('producto_id', injected.data.id);
    await supabase.from('sipro_productos').delete().eq('id', injected.data.id);
  }
  const typographyOk = parseFloat(result.pages.panel.introFontSize) >= 16 && parseFloat(result.pages.panel.dateFontSize) >= 15;
  const notificationOk = Number(result.pages.usuarios.notificationLayout.toastZ) > Number(result.pages.usuarios.notificationLayout.modalZ)
    && (result.pages.usuarios.notificationLayout.viewportWidth < 1200 || result.pages.usuarios.notificationLayout.sideBySide);
  const updateModalOk = result.pages.updateModal.visible
    && /logo hotel\.png$/.test(result.pages.updateModal.logo || '')
    && result.pages.updateModal.installButton === 'Instalar ahora'
    && result.pages.updateModal.laterButton === 'Más tarde';
  const navigationOk = result.pages.firstNavigation.emptySamples === 0 && result.pages.firstNavigation.loadingCleared;
  const messageOk = result.pages.userMessage === 'La contraseña debe tener al menos 12 caracteres.';
  if (result.pages.login.requireType !== 'undefined' || result.pages.productos.xssExecuted || !result.pages.usuarios.userCreated || !typographyOk || !notificationOk || !updateModalOk || !navigationOk || !messageOk || result.rendererErrors.length) {
    throw new Error(`Auditoría Electron falló: ${JSON.stringify(result)}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

run().catch(error => { console.error(error); process.exitCode = 1; });
