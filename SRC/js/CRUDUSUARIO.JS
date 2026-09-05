(function () {
  let usuarios = [], editando = null, pagina = 1, totalPaginas = 1;
  const pageSize = 10, tbody = document.querySelector('#tablaUsuarios tbody'), filtro = document.getElementById('filtro');
  const form = document.createElement('form');
  form.id = 'formUsuario';
  form.innerHTML = `
    <input type="hidden" id="idUsuario">
    <div><label for="nombreUsuario">Nombre</label><input type="text" id="nombreUsuario" class="form-control" placeholder="Nombre" required></div>
    <div><label for="emailUsuario">Correo</label><input type="email" id="emailUsuario" class="form-control" placeholder="Correo" required></div>
    <div>
      <label for="passwordUsuario" id="passwordUsuarioLabel">Contraseña</label>
      <div class="user-password-field">
        <input type="password" id="passwordUsuario" class="form-control" placeholder="Mínimo 12 caracteres" autocomplete="new-password">
        <button type="button" class="password-visibility-toggle" id="togglePasswordUsuario" aria-label="Mostrar contraseña" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></button>
      </div>
      <small class="password-help" id="passwordUsuarioHelp">Define la contraseña inicial del nuevo usuario.</small>
    </div>
    <div><label for="rolUsuario">Rol</label><select id="rolUsuario" class="form-select" required><option value="">Rol</option><option value="admin">Admin</option><option value="encargado">Encargado</option><option value="inventario">Inventario</option><option value="consulta">Consulta</option></select></div>
  `;
  const fields = { id: form.querySelector('#idUsuario'), name: form.querySelector('#nombreUsuario'), email: form.querySelector('#emailUsuario'), password: form.querySelector('#passwordUsuario'), role: form.querySelector('#rolUsuario') };
  const passwordLabel = form.querySelector('#passwordUsuarioLabel');
  const passwordHelp = form.querySelector('#passwordUsuarioHelp');
  const passwordVisibility = SiproPasswordVisibility.attach(form.querySelector('#togglePasswordUsuario'), fields.password);
  const safeText = value => String(value ?? '');
  const showOperationError = (error, fallback) => mostrarToast(mensajeParaUsuario(error, fallback), 'danger', 'No se pudo guardar');
  const deleteConfirmation = user => {
    const paragraph = document.createElement('p');
    paragraph.append('¿Deseas eliminar ');
    const name = document.createElement('strong');
    name.textContent = safeText(user.nombre);
    paragraph.append(name, '?');
    return paragraph;
  };
  async function cargarUsuarios() { const result = await window.electronAPI.getUsuarios({ page: pagina, pageSize, search: filtro.value.trim() }); usuarios = result.data; totalPaginas = Math.max(1, result.totalPages); renderTabla(result); }
  form.addEventListener('submit', async event => { event.preventDefault(); const usuario = { nombre: fields.name.value.trim(), email: fields.email.value.trim(), password: fields.password.value, rol: fields.role.value }; if (!usuario.nombre) return mostrarToast('Escribe el nombre de la persona.', 'warning', 'Falta información'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email)) return mostrarToast('Escribe un correo electrónico válido.', 'warning', 'Revisa el correo'); if (!usuario.rol) return mostrarToast('Selecciona el rol que tendrá el usuario.', 'warning', 'Falta información'); if ((!editando || usuario.password) && usuario.password.length < 12) return mostrarToast('La contraseña debe tener al menos 12 caracteres.', 'warning', 'Contraseña muy corta'); const submit = document.querySelector('[data-modal-submit]'); if (submit) { submit.disabled = true; submit.textContent = 'Guardando...'; } try { if (editando) await window.electronAPI.updateUsuario(editando, usuario); else await window.electronAPI.createUsuario(usuario); SiproUI.closeModal(); form.reset(); fields.id.value = ''; editando = null; await cargarUsuarios(); mostrarToast('Usuario guardado correctamente', 'success'); } catch (error) { console.error('[Users][save]', error); showOperationError(error, 'No fue posible guardar el usuario. Revisa los datos e inténtalo nuevamente.'); } finally { if (submit) { submit.disabled = false; submit.textContent = editando ? 'Guardar cambios' : 'Guardar usuario'; } } });
  function renderTabla(result) { tbody.replaceChildren(); usuarios.forEach(user => { const tr = document.createElement('tr'); [user.id, user.nombre, user.email, user.rol].forEach(value => { const td = document.createElement('td'); td.textContent = safeText(value); tr.appendChild(td); }); const actions = document.createElement('td'); [['Editar', 'pencil', 'btn-secondary', () => editarUsuario(user.id)], ['Eliminar', 'trash-2', 'btn-danger', () => eliminarUsuario(user.id)]].forEach(([label, icon, style, fn]) => { const button = document.createElement('button'); button.className = `btn btn-sm action-${style.replace('btn-', '')}`; button.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i> <span>${label}</span>`; button.setAttribute('aria-label', label); button.onclick = fn; actions.appendChild(button); }); tr.appendChild(actions); tbody.appendChild(tr); }); if (!tbody.children.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 5; td.className = 'empty-state'; td.textContent = result?.total === 0 ? 'No hay usuarios registrados' : 'No se encontraron coincidencias'; tr.appendChild(td); tbody.appendChild(tr); } document.getElementById('paginacionInfo').textContent = result ? `Página ${result.page} de ${totalPaginas} (${result.total} registros)` : ''; document.getElementById('paginaAnterior').disabled = pagina <= 1; document.getElementById('paginaSiguiente').disabled = pagina >= totalPaginas; window.lucide?.createIcons({ root: tbody }); }
  function abrirFormulario(usuario = null) {
    editando = usuario?.id || null;
    fields.id.value = usuario?.id || '';
    fields.name.value = usuario?.nombre || '';
    fields.email.value = usuario?.email || '';
    fields.password.value = '';
    fields.role.value = usuario?.rol || '';
    passwordVisibility.setVisible(false);
    passwordLabel.textContent = usuario ? 'Nueva contraseña (opcional)' : 'Contraseña';
    fields.password.placeholder = usuario ? 'Dejar vacío para conservar la actual' : 'Mínimo 12 caracteres';
    fields.password.required = !usuario;
    passwordHelp.textContent = usuario
      ? 'La contraseña actual nunca se muestra. Escribe una nueva únicamente si deseas reemplazarla.'
      : 'Define la contraseña inicial del nuevo usuario.';
    SiproUI.openModal({ title: usuario ? 'Editar usuario' : 'Nuevo usuario', subtitle: usuario ? 'Actualiza los datos de acceso' : 'Registra un nuevo acceso al sistema', icon: usuario ? 'user-pen' : 'user-plus', content: form, submitLabel: usuario ? 'Guardar cambios' : 'Guardar usuario', onSubmit: () => form.requestSubmit() });
  }
  filtro.addEventListener('input', () => { pagina = 1; cargarUsuarios(); }); document.getElementById('paginaAnterior').addEventListener('click', () => { if (pagina > 1) { pagina--; cargarUsuarios(); } }); document.getElementById('paginaSiguiente').addEventListener('click', () => { if (pagina < totalPaginas) { pagina++; cargarUsuarios(); } }); window.editarUsuario = id => { const u = usuarios.find(item => item.id == id); if (u) abrirFormulario(u); }; window.eliminarUsuario = async id => { const u = usuarios.find(item => item.id == id); if (!u) return; SiproUI.openModal({ title: 'Eliminar usuario', subtitle: 'Esta acción requiere confirmación', icon: 'trash-2', content: deleteConfirmation(u), submitLabel: 'Eliminar', variant: 'danger', onSubmit: async overlay => { const button = overlay.querySelector('[data-modal-submit]'); button.disabled = true; try { await window.electronAPI.deleteUsuario(id); SiproUI.closeModal(); await cargarUsuarios(); mostrarToast('Usuario eliminado correctamente', 'success'); } catch (error) { console.error('[Users][delete]', error); mostrarToast(mensajeParaUsuario(error, 'No fue posible eliminar el usuario. Inténtalo nuevamente.'), 'danger', 'No se pudo eliminar'); } finally { button.disabled = false; } } }); }; window.volver = () => window.showView ? window.showView('dashboard') : (window.location.href = 'panelPrincipal.html'); document.getElementById('newUserButton').addEventListener('click', () => abrirFormulario()); cargarUsuarios().catch(error => { console.error('[usuarios]', error); mostrarToast(mensajeParaUsuario(error, 'No fue posible cargar la lista de usuarios. Revisa la conexión.'), 'danger', 'No se pudieron cargar los usuarios'); });
})();
