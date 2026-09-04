// src/helpers/notificaciones.js
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
  body.append(titleNode, document.createTextNode(String(mensaje)));
  toastElement.appendChild(body);
  toastContainer.appendChild(toastElement);
  setTimeout(() => toastElement.remove(), 4000);
}

// Exportar para usar en cualquier script


if (typeof module !== "undefined") {
  module.exports = { mostrarToast };
}

if (typeof window !== "undefined") window.mostrarToast = mostrarToast;
