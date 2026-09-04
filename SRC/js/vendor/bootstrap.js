class Modal {
  constructor(element) { this.element = element; }
  show() { this.element.classList.add('show'); }
  hide() { this.element.classList.remove('show'); this.element.dispatchEvent(new Event('hidden.bs.modal')); }
}
class Toast {
  constructor(element) { this.element = element; }
  show() { this.element.hidden = false; setTimeout(() => this.element.remove(), 4000); }
}
window.bootstrap = { Modal, Toast };
