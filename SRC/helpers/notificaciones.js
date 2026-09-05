// src/helpers/notificaciones.js
function mensajeParaUsuario(errorOMensaje, respaldo = 'No fue posible completar la operación. Inténtalo de nuevo.') {
  const code = String(errorOMensaje?.code || errorOMensaje?.cause?.code || '').toUpperCase();
  let mensaje = String(errorOMensaje?.message || errorOMensaje || '').trim();

  // Electron antepone información del canal IPC. Esa información sirve al equipo técnico,
  // pero no ayuda a la persona que está usando la aplicación.
  mensaje = mensaje
    .replace(/^Error invoking remote method ['"][^'"]+['"]:\s*/i, '')
    .replace(/^(Error:\s*)+/i, '')
    .replace(/^Remote method failed:\s*/i, '')
    .trim();

  if (/contrase(?:ña|na).*(12|doce).*caracter/i.test(mensaje)) return 'La contraseña debe tener al menos 12 caracteres.';
  if (/already registered|already exists|duplicate|duplicad|23505/i.test(`${code} ${mensaje}`)) {
    if (/correo|email|user|usuario/i.test(mensaje)) return 'Ya existe un usuario registrado con ese correo.';
    if (/barra|barcode|c[oó]digo|producto/i.test(mensaje)) return 'Ya existe un producto con ese código de barras.';
    return 'Ya existe un registro con esos datos. Revisa la información e inténtalo nuevamente.';
  }
  if (/invalid login credentials|credenciales|invalid_credentials/i.test(`${code} ${mensaje}`)) return 'El correo o la contraseña no son correctos.';
  if (/jwt|session|token.*expired|sesión.*expir/i.test(`${code} ${mensaje}`)) return 'Tu sesión venció. Cierra sesión y vuelve a ingresar.';
  if (/fetch failed|failed to fetch|econnrefused|enotfound|etimedout|network|conexi[oó]n/i.test(`${code} ${mensaje}`)) return 'No fue posible conectarse con el servicio. Revisa Internet e inténtalo nuevamente.';
  if (/permission denied|not authorized|unauthorized|no autorizado|42501/i.test(`${code} ${mensaje}`)) return 'Tu usuario no tiene permiso para realizar esta acción.';
  if (/stock insuficiente/i.test(mensaje)) return 'No hay suficiente stock para registrar esta salida.';
  if (/cantidad inv[aá]lida/i.test(mensaje)) return 'Indica una cantidad entera mayor que cero.';
  if (/correo inv[aá]lido/i.test(mensaje)) return 'Escribe un correo electrónico válido.';
  if (/rol no v[aá]lido/i.test(mensaje)) return 'Selecciona un rol válido para el usuario.';

  const pareceTecnico = !mensaje || /PGRST\d+|PostgrestError|TypeError|ReferenceError|at\s+\w+|stack|ECONN|supabase|remote method|SQLSTATE/i.test(mensaje);
  if (pareceTecnico) return respaldo;
  return mensaje.length > 220 ? respaldo : mensaje;
}

function mostrarToast(mensaje, tipo = "info", titulo = "Notificación") {
  let toastContainer = document.querySelector(".toast-container");

  // Si no existe el contenedor, lo creamos dinámicamente
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3";
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastContainer);
  }

  // Crear un ID único para cada toast
  const toastId = `toast-${Date.now()}`;

  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  toastElement.className = `toast text-bg-${tipo} border-0`;
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', tipo === 'danger' ? 'assertive' : 'polite');
  const body = document.createElement('div');
  body.className = 'toast-body';
  const titleNode = document.createElement('strong');
  titleNode.textContent = `${titulo}: `;
  body.append(titleNode, document.createTextNode(mensajeParaUsuario(mensaje)));
  toastElement.appendChild(body);
  toastContainer.appendChild(toastElement);
  setTimeout(() => toastElement.remove(), 4000);
}

// Exportar para usar en cualquier script


if (typeof module !== "undefined") {
  module.exports = { mostrarToast, mensajeParaUsuario };
}

if (typeof window !== "undefined") {
  window.mostrarToast = mostrarToast;
  window.mensajeParaUsuario = mensajeParaUsuario;
}
