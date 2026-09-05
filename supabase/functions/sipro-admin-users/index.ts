import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' }
});
const roles = new Set(['admin', 'encargado', 'inventario', 'consulta']);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido' });
  const authorization = request.headers.get('authorization');
  if (!authorization) return json(401, { ok: false, error: 'Sesión requerida' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json(500, { ok: false, error: 'Configuración incompleta' });

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  const caller = callerData.user;
  if (callerError || !caller || caller.app_metadata?.app !== 'sipro' || caller.app_metadata?.role !== 'admin') {
    return json(403, { ok: false, error: 'Se requiere un administrador SIPRO' });
  }

  try {
    const body = await request.json();
    const action = String(body.action || '');
    if (action === 'create') {
      if (!roles.has(body.rol) || typeof body.password !== 'string' || body.password.length < 12) {
        return json(400, { ok: false, error: 'Datos de usuario inválidos' });
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email: String(body.email).trim().toLowerCase(),
        password: body.password,
        email_confirm: true,
        user_metadata: { name: String(body.nombre).trim() },
        app_metadata: { app: 'sipro', role: body.rol }
      });
      if (error) throw error;
      const { data: profile, error: profileError } = await adminClient.from('sipro_usuarios').select('*').eq('auth_user_id', data.user.id).single();
      if (profileError) throw profileError;
      return json(200, { ok: true, user: profile });
    }

    const id = Number(body.id);
    const { data: profile, error: profileError } = await adminClient.from('sipro_usuarios').select('*').eq('id', id).single();
    if (profileError || !profile) return json(404, { ok: false, error: 'Usuario no encontrado' });
    if (profile.auth_user_id === caller.id && action === 'delete') {
      return json(409, { ok: false, error: 'No puedes eliminar tu propia cuenta' });
    }

    if (action === 'update') {
      if (!roles.has(body.rol)) return json(400, { ok: false, error: 'Rol inválido' });
      const attributes: Record<string, unknown> = {
        email: String(body.email).trim().toLowerCase(),
        email_confirm: true,
        user_metadata: { name: String(body.nombre).trim() },
        app_metadata: { app: 'sipro', role: body.rol }
      };
      if (body.password) {
        if (String(body.password).length < 12) return json(400, { ok: false, error: 'Contraseña demasiado corta' });
        attributes.password = body.password;
      }
      const { error } = await adminClient.auth.admin.updateUserById(profile.auth_user_id, attributes);
      if (error) throw error;
      const { data: updated, error: updateError } = await adminClient.from('sipro_usuarios')
        .update({ nombre: String(body.nombre).trim(), email: attributes.email, rol: body.rol, activo: body.activo !== false, actualizado_en: new Date().toISOString() })
        .eq('id', id).select('*').single();
      if (updateError) throw updateError;
      return json(200, { ok: true, user: updated });
    }

    if (action === 'delete') {
      const { error } = await adminClient.auth.admin.deleteUser(profile.auth_user_id);
      if (error) throw error;
      return json(200, { ok: true, user: profile });
    }
    return json(400, { ok: false, error: 'Acción inválida' });
  } catch (error) {
    console.error('[sipro-admin-users]', error);
    return json(400, { ok: false, error: error instanceof Error ? error.message : 'Error inesperado' });
  }
});
