(function () {
  window.__siproProductScannerCleanup?.();
  let productos = [], categorias = [], editando = null, pagina = 1, totalPaginas = 1;
  const pageSize = 10;
  const tbody = document.querySelector('#tablaProductos tbody');
  const filtro = document.getElementById('filtro');
  const filtroCategoria = document.getElementById('filtroCategoria');
  const form = document.createElement('form');
  form.id = 'formProducto';
  form.innerHTML = '<input type="hidden" id="idProducto"><div><label for="codigodebarra">Código de barras</label><input type="text" id="codigodebarra" class="form-control" placeholder="Código de barra" required></div><div><label for="nombre">Nombre</label><input type="text" id="nombre" class="form-control" placeholder="Nombre del producto" required></div><div><label for="precio">Precio</label><input type="number" id="precio" class="form-control" placeholder="Precio" required min="0" step="0.01"></div><div><label for="stock">Stock</label><input type="number" id="stock" class="form-control" placeholder="Stock" required min="0" step="1"></div><div><label for="categoria">Categoría</label><select id="categoria" class="form-select" required><option value="">Seleccionar categoría</option></select></div>';
  const value = id => document.getElementById(id).value;
  const setValue = (id, v) => { form.querySelector(`#${id}`).value = v ?? ''; };
  const escapeHtml = value => { const node = document.createElement('span'); node.textContent = value ?? ''; return node.innerHTML; };
  const session = JSON.parse(sessionStorage.getItem('siproSession') || 'null');
  const canDelete = session?.permisos?.includes('productos:delete');

  async function cargarCategorias() {
    categorias = await window.electronAPI.getCategorias();
    const select = form.querySelector('#categoria');
    select.replaceChildren(new Option('Seleccionar categoría', ''));
    filtroCategoria.replaceChildren(new Option('Todas las categorías', ''));
    categorias.forEach(c => { select.add(new Option(c.nombre, c.id)); filtroCategoria.add(new Option(c.nombre, c.id)); });
  }
  async function cargarProductos() {
    const result = await window.electronAPI.getProductos({ page: pagina, pageSize, search: filtro.value.trim(), categoryId: filtroCategoria.value });
    productos = result.data; totalPaginas = Math.max(1, result.totalPages); renderTabla(result);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const producto = { codigodebarra: value('codigodebarra').trim(), nombre: value('nombre').trim(), precio: Number(value('precio')), stock: Number(value('stock')), categoria_id: Number(value('categoria')) };
    if (!producto.codigodebarra || !producto.nombre || !producto.categoria_id || producto.stock < 0 || producto.precio < 0) return mostrarToast('Completa los campos del producto con valores válidos.', 'warning');
    const submit = document.querySelector('[data-modal-submit]'); if (submit) { submit.disabled = true; submit.textContent = 'Guardando...'; }
    try { if (editando) await window.electronAPI.updateProducto(editando, producto); else await window.electronAPI.createProducto(producto); SiproUI.closeModal(); form.reset(); editando = null; await cargarProductos(); mostrarToast('Producto guardado correctamente', 'success'); }
    catch (error) { console.error('[Products][save]', error); mostrarToast('No se pudo guardar el producto.', 'danger'); }
    finally { if (submit) { submit.disabled = false; submit.textContent = editando ? 'Guardar cambios' : 'Guardar producto'; } }
  });
  function renderTabla(result) {
    tbody.replaceChildren();
    productos.forEach(p => {
      const tr = document.createElement('tr');
      [p.id, p.codigodebarra, p.nombre, p.precio].forEach(v => { const td = document.createElement('td'); td.textContent = String(v); tr.appendChild(td); });
      const stock = document.createElement('td'); stock.textContent = String(p.stock); stock.className = p.stock < 10 ? 'stock-bajo' : p.stock <= 15 ? 'stock-medio' : 'stock-alto'; tr.appendChild(stock);
      const cat = document.createElement('td'); cat.textContent = p.categoria; tr.appendChild(cat);
      const actions = document.createElement('td');
      const availableActions = [['Editar', 'pencil', 'btn-secondary', () => editarProducto(p.id)], ['Entrada', 'arrow-down-to-line', 'btn-success', () => cambiarStock(p.id, 'entrada')], ['Salida', 'arrow-up-from-line', 'btn-warning', () => cambiarStock(p.id, 'salida')]];
      if (canDelete) availableActions.splice(1, 0, ['Eliminar', 'trash-2', 'btn-danger', () => eliminarProducto(p.id)]);
      availableActions.forEach(([label, icon, style, fn]) => { const b = document.createElement('button'); b.className = `btn btn-sm action-${style.replace('btn-', '')}`; b.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i> <span>${label}</span>`; b.setAttribute('aria-label', label); b.onclick = fn; actions.appendChild(b); });
      tr.appendChild(actions); tbody.appendChild(tr);
    });
    if (!tbody.children.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 7; td.className = 'empty-state'; td.textContent = result?.total === 0 ? 'No hay productos registrados' : 'No se encontraron coincidencias'; tr.appendChild(td); tbody.appendChild(tr); }
    document.getElementById('paginacionInfo').textContent = result ? `Página ${result.page} de ${totalPaginas} (${result.total} registros)` : '';
    document.getElementById('paginaAnterior').disabled = pagina <= 1; document.getElementById('paginaSiguiente').disabled = pagina >= totalPaginas; window.lucide?.createIcons({ root: tbody });
  }
  async function cambiarStock(id, tipo) {
    const producto = productos.find(item => item.id == id); if (!producto) return;
    const action = tipo === 'entrada' ? 'entrada' : 'salida';
    const modal = SiproUI.openModal({ title: `Registrar ${action}`, subtitle: 'Actualiza el stock de forma segura', icon: action === 'entrada' ? 'arrow-down-to-line' : 'arrow-up-from-line', content: `<div><p><strong>${escapeHtml(producto.nombre)}</strong></p><p>Stock actual: ${producto.stock}</p><label for="movementQuantity">Cantidad</label><input id="movementQuantity" class="form-control" type="number" min="1" step="1" autofocus></div>`, submitLabel: `Registrar ${action}`, variant: action === 'entrada' ? 'success' : 'primary', onSubmit: async overlay => { const input = overlay.querySelector('#movementQuantity'); const cantidad = Number(input.value); if (!Number.isInteger(cantidad) || cantidad <= 0) return mostrarToast('La cantidad debe ser un entero mayor que cero.', 'warning'); const button = overlay.querySelector('[data-modal-submit]'); button.disabled = true; button.textContent = 'Registrando...'; try { const result = action === 'entrada' ? await window.electronAPI.entradaProducto(id, cantidad) : await window.electronAPI.salidaProducto(id, cantidad); if (!result) return mostrarToast('Stock insuficiente para registrar la salida.', 'warning'); SiproUI.closeModal(); await cargarProductos(); mostrarToast(`${action === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`, 'success'); } catch (error) { console.error(`[Products][${action}]`, error); mostrarToast('No se pudo registrar el movimiento.', 'danger'); } finally { button.disabled = false; button.textContent = `Registrar ${action}`; } } });
    modal.querySelector('#movementQuantity').focus();
  }
  function abrirFormularioProducto(producto = null) { editando = producto?.id || null; setValue('idProducto', producto?.id); setValue('codigodebarra', producto?.codigodebarra); setValue('nombre', producto?.nombre); setValue('precio', producto?.precio); setValue('stock', producto?.stock); form.querySelector('#stock').readOnly = Boolean(producto?.id); setValue('categoria', producto?.categoria_id); SiproUI.openModal({ title: producto ? 'Editar producto' : 'Nuevo producto', content: form, submitLabel: producto ? 'Guardar cambios' : 'Guardar producto', onSubmit: () => form.requestSubmit() }); }
  window.editarProducto = id => { const p = productos.find(item => item.id == id); if (p) abrirFormularioProducto(p); };
  window.eliminarProducto = async id => { const producto = productos.find(item => item.id == id); if (!producto) return; SiproUI.openModal({ title: 'Eliminar producto', subtitle: 'Esta acción requiere confirmación', icon: 'trash-2', content: `<p>¿Deseas eliminar <strong>${escapeHtml(producto.nombre)}</strong>?</p><p>Sus movimientos se conservarán desvinculados.</p>`, submitLabel: 'Eliminar', variant: 'danger', onSubmit: async overlay => { const button = overlay.querySelector('[data-modal-submit]'); button.disabled = true; try { await window.electronAPI.deleteProducto(id); SiproUI.closeModal(); await cargarProductos(); mostrarToast('Producto eliminado correctamente', 'success'); } catch (error) { console.error('[Products][delete]', error); mostrarToast('No se pudo eliminar el producto.', 'danger'); } finally { button.disabled = false; } } }); };
  document.getElementById('newProductButton').addEventListener('click', () => abrirFormularioProducto());
  let debounce; const recargar = () => { clearTimeout(debounce); debounce = setTimeout(() => { pagina = 1; cargarProductos().catch(() => mostrarToast('No se pudo cargar el inventario', 'danger')); }, 300); }; filtro.addEventListener('input', recargar); filtroCategoria.addEventListener('change', () => { pagina = 1; cargarProductos(); }); document.getElementById('paginaAnterior').addEventListener('click', () => { if (pagina > 1) { pagina--; cargarProductos(); } }); document.getElementById('paginaSiguiente').addEventListener('click', () => { if (pagina < totalPaginas) { pagina++; cargarProductos(); } });
  let scannerBuffer = '', scannerStartedAt = 0, scannerLastAt = 0, scannerLocked = false;
  const scannerKeydown = event => { const editable = event.target?.matches?.('input, textarea, select, [contenteditable="true"]'); if (editable && event.target.id !== 'codigodebarra') return; const now = performance.now(); if (event.key === 'Enter') { const elapsed = now - scannerStartedAt; const average = scannerBuffer.length > 1 ? elapsed / scannerBuffer.length : Infinity; const code = event.target.id === 'codigodebarra' ? event.target.value.trim() : scannerBuffer; if (scannerBuffer.length >= 6 && average <= 60 && code && !scannerLocked) { event.preventDefault(); procesarEscaneo(code); } scannerBuffer = ''; return; } if (event.key.length !== 1) return; if (!scannerLastAt || now - scannerLastAt > 100) { scannerBuffer = event.key; scannerStartedAt = now; } else scannerBuffer += event.key; scannerLastAt = now; };
  document.addEventListener('keydown', scannerKeydown);
  window.__siproProductScannerCleanup = () => { document.removeEventListener('keydown', scannerKeydown); delete window.__siproProductScannerCleanup; };
  async function procesarEscaneo(codigo) { scannerLocked = true; try { const producto = await window.electronAPI.getProductoByCodigo(codigo); if (producto) { mostrarToast('Producto encontrado', 'success'); abrirFormularioProducto(producto); } else { mostrarToast('Código nuevo detectado', 'info'); abrirFormularioProducto({ codigodebarra: codigo }); } } catch (error) { console.error('[Products][barcode]', error); mostrarToast('No fue posible buscar el código de barras.', 'danger'); } finally { scannerLocked = false; } }
  Promise.all([cargarCategorias(), cargarProductos()]).catch(error => { console.error('[productos]', error); mostrarToast('No se pudo cargar el inventario', 'danger'); });
})();
