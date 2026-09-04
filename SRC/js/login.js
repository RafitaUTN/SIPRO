function mostrarLoginError(mensaje) {
  const body = document.getElementById('toastBody');
  if (body) body.textContent = mensaje;
  const toast = document.getElementById('toastMsg');
  if (toast) { toast.hidden = false; setTimeout(() => { toast.hidden = true; }, 4000); }
}

function mensajeDeLogin(error) {
  const code = error?.code || error?.cause?.code;
  if (code === 'PGRST116') return 'Correo o contraseña incorrectos.';
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'FetchError'].includes(code)) {
    return 'No se puede conectar con la base de datos. Comprueba que Supabase esté disponible.';
  }
  if (code === '42501' || /permission|not authorized|unauthorized/i.test(error?.message || '')) {
    return 'Tu usuario no tiene permisos para iniciar sesión.';
  }
  return 'No se pudo iniciar sesión. Comprueba la configuración de la base de datos.';
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.target.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Ingresando...';
  try {
    const session = await window.electronAPI.login(
      document.getElementById('email').value,
      document.getElementById('password').value
    );
    if (!session) return mostrarLoginError('Credenciales incorrectas');
    sessionStorage.setItem('siproSession', JSON.stringify(session));
    window.location.href = 'panelPrincipal.html';
  } catch (error) {
    console.error('[login]', error);
    mostrarLoginError(mensajeDeLogin(error));
  } finally {
    submit.disabled = false;
    submit.textContent = 'Ingresar';
  }
});

document.getElementById('togglePassword').addEventListener('click', () => {
  const field = document.getElementById('password');
  field.type = field.type === 'password' ? 'text' : 'password';
});

window.lucide?.createIcons();
