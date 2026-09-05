(function (global) {
  function renderIcon(button, visible) {
    const icon = document.createElement('i');
    icon.dataset.lucide = visible ? 'eye-off' : 'eye';
    icon.setAttribute('aria-hidden', 'true');
    button.replaceChildren(icon);
    global.lucide?.createIcons({ root: button });
  }

  function attach(button, field) {
    if (!button || !field) throw new Error('El control de contraseña requiere un botón y un campo.');

    const setVisible = visible => {
      field.type = visible ? 'text' : 'password';
      const action = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      button.setAttribute('aria-pressed', String(visible));
      renderIcon(button, visible);
    };

    button.addEventListener('click', () => {
      setVisible(field.type === 'password');
      field.focus({ preventScroll: true });
    });
    setVisible(false);

    return { setVisible };
  }

  global.SiproPasswordVisibility = Object.freeze({ attach });
})(window);
