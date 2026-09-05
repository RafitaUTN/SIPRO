(function () {
  let activeModal = null;
  let activeModalOnClose = null;
  let returnFocus = null;
  function closeModal(reason = 'programmatic') { if (!activeModal) return; const modal = activeModal; const onClose = activeModalOnClose; activeModal = null; activeModalOnClose = null; modal.remove(); document.body.classList.remove('modal-open'); returnFocus?.focus(); onClose?.(reason); }
  function openModal({ title, subtitle = '', icon = 'square-pen', content, submitLabel, onSubmit, variant = 'primary', cancelLabel = 'Cancelar', onClose, closeOnBackdrop = true }) {
    closeModal('replaced'); returnFocus = document.activeElement;
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.innerHTML = `<section class="app-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-head"><div class="modal-head-left"><div class="modal-icon"><i data-lucide="${icon}" aria-hidden="true"></i></div><div><h2 id="modalTitle">${title}</h2>${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}</div></div><button type="button" class="modal-close" data-modal-close aria-label="Cerrar"><i data-lucide="x" aria-hidden="true"></i></button></header><div class="modal-body"></div><footer class="modal-footer"><button type="button" class="btn-text" data-modal-close>${cancelLabel}</button>${submitLabel ? `<button type="button" class="btn btn-${variant}" data-modal-submit>${submitLabel}</button>` : ''}</footer></section>`;
    const body = overlay.querySelector('.modal-body'); if (typeof content === 'string') body.innerHTML = content; else body.append(content);
    document.body.append(overlay); document.body.classList.add('modal-open'); activeModal = overlay; activeModalOnClose = onClose || null; window.lucide?.createIcons({ root: overlay });
    overlay.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', () => closeModal('cancel')));
    overlay.addEventListener('click', event => { if (event.target === overlay && closeOnBackdrop && !body.querySelector('form')) closeModal('cancel'); });
    overlay.querySelector('[data-modal-submit]')?.addEventListener('click', () => onSubmit?.(overlay));
    overlay.querySelector('input, select, textarea, button')?.focus();
    return overlay;
  }
  document.addEventListener('keydown', event => { if (!activeModal) return; if (event.key === 'Escape') closeModal('cancel'); if (event.key === 'Tab') { const items = [...activeModal.querySelectorAll('button,input,select,textarea')].filter(item => !item.disabled); if (!items.length) return; const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
  window.SiproUI = { openModal, closeModal };
})();
