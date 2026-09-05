const { getSupabase } = require('./supabaseClient');

const ROLES = new Set(['admin', 'encargado', 'inventario', 'consulta']);
const USER_COLUMNS = 'id, auth_user_id, nombre, email, rol, activo, creado_en, actualizado_en';

function normalizeEmail(email) {
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) throw new Error('Correo inválido');
  return email.trim().toLowerCase();
}

function validatePassword(password, optional = false) {
  if (optional && !password) return undefined;
  if (typeof password !== 'string' || password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres');
  return password;
}

function validateLoginPassword(password) {
  if (typeof password !== 'string' || password.length < 1 || password.length > 1024) {
    throw new Error('Contraseña inválida');
  }
  return password;
}

function toSafeUser(user) {
  if (!user) return null;
  const { id, auth_user_id, nombre, email, rol, activo, creado_en, actualizado_en } = user;
  return { id, auth_user_id, nombre, email, rol, activo, creado_en, actualizado_en };
}

async function validarLogin(email, password) {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email), password: validateLoginPassword(password)
  });
  if (authError) {
    if (['invalid_credentials', 'email_not_confirmed'].includes(authError.code)) return null;
    throw authError;
  }
  const { data, error } = await supabase.from('sipro_usuarios').select(USER_COLUMNS)
    .eq('auth_user_id', authData.user.id).eq('activo', true).single();
  if (error || !data) {
    await supabase.auth.signOut();
    if (error?.code === 'PGRST116') return null;
    throw error || new Error('El usuario no pertenece a SIPRO');
  }
  return toSafeUser(data);
}

async function cerrarSesion() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

async function getAllUsuarios(options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 10));
  let query = getSupabase().from('sipro_usuarios').select(USER_COLUMNS, { count: 'exact' }).order('id');
  if (options.search) {
    const term = String(options.search).replace(/[,%()]/g, ' ').trim();
    if (term) query = query.or(`nombre.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const total = count || 0;
  return { data: (data || []).map(toSafeUser), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function invokeAdmin(action, payload) {
  const { data, error } = await getSupabase().functions.invoke('sipro-admin-users', { body: { action, ...payload } });
  if (error) {
    let message = error.message;
    try {
      const response = error.context?.clone ? error.context.clone() : error.context;
      const details = response?.json ? await response.json() : null;
      if (details?.error) message = details.error;
    } catch {
      // Conserva el mensaje original cuando el gateway no devuelve JSON.
    }
    throw new Error(message || 'No fue posible gestionar el usuario');
  }
  if (!data?.ok) throw new Error(data?.error || 'No fue posible gestionar el usuario');
  return toSafeUser(data.user);
}

async function createUsuario({ nombre, email, password, rol = 'consulta' }) {
  if (!ROLES.has(rol)) throw new Error('Rol no válido');
  return invokeAdmin('create', { nombre: String(nombre || '').trim(), email: normalizeEmail(email), password: validatePassword(password), rol });
}

async function updateUsuario(id, { nombre, email, password, rol, activo = true }) {
  if (!ROLES.has(rol)) throw new Error('Rol no válido');
  return invokeAdmin('update', { id: Number(id), nombre: String(nombre || '').trim(), email: normalizeEmail(email), password: validatePassword(password, true), rol, activo: Boolean(activo) });
}

async function deleteUsuario(id) {
  await invokeAdmin('delete', { id: Number(id) });
}

module.exports = { getAllUsuarios, createUsuario, updateUsuario, deleteUsuario, validarLogin, cerrarSesion, toSafeUser, normalizeEmail };
