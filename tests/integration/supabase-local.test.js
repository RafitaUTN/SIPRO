const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url || '')) {
  throw new Error('Las pruebas de integración se niegan a usar un Supabase remoto');
}
if (!anon || !service) throw new Error('Faltan claves locales de Supabase');

const makeClient = key => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

test('RLS impide lectura anónima y permite lectura autenticada de SIPRO', async () => {
  const anonymous = makeClient(anon);
  const denied = await anonymous.from('sipro_productos').select('id').limit(1);
  assert.equal(denied.data?.length || 0, 0);

  const admin = makeClient(anon);
  const login = await admin.auth.signInWithPassword({ email: 'admin.local@example.invalid', password: 'AuditOnly-Admin-123!' });
  assert.equal(login.error, null);
  const allowed = await admin.from('sipro_productos').select('id').limit(1);
  assert.equal(allowed.error, null);
  assert.equal(allowed.data.length, 1);
});

test('una salida concurrente no permite stock negativo ni actualización perdida', async () => {
  const admin = makeClient(anon);
  const login = await admin.auth.signInWithPassword({ email: 'admin.local@example.invalid', password: 'AuditOnly-Admin-123!' });
  assert.equal(login.error, null);
  const serviceClient = makeClient(service);
  const category = await serviceClient.from('sipro_categorias').select('id').limit(1).single();
  assert.equal(category.error, null);
  const barcode = `TEST-${Date.now()}`;
  const inserted = await serviceClient.from('sipro_productos').insert({ codigodebarra: barcode, nombre: 'Producto temporal de concurrencia', precio: 1, stock: 10, categoria_id: category.data.id }).select('id').single();
  assert.equal(inserted.error, null);

  const calls = await Promise.all([
    admin.rpc('sipro_ajustar_stock', { p_producto_id: inserted.data.id, p_cantidad: 7, p_tipo: 'salida' }),
    admin.rpc('sipro_ajustar_stock', { p_producto_id: inserted.data.id, p_cantidad: 7, p_tipo: 'salida' })
  ]);
  assert.equal(calls.filter(result => !result.error).length, 1);
  const current = await serviceClient.from('sipro_productos').select('stock').eq('id', inserted.data.id).single();
  assert.equal(current.data.stock, 3);
  await serviceClient.from('sipro_movimientos_stock').delete().eq('producto_id', inserted.data.id);
  await serviceClient.from('sipro_productos').delete().eq('id', inserted.data.id);
});

test('la función administrativa crea y elimina usuarios SIPRO mediante Auth', async () => {
  const admin = makeClient(anon);
  const login = await admin.auth.signInWithPassword({ email: 'admin.local@example.invalid', password: 'AuditOnly-Admin-123!' });
  assert.equal(login.error, null);
  const email = `temporal-${Date.now()}@example.invalid`;
  const created = await admin.functions.invoke('sipro-admin-users', { body: { action: 'create', nombre: 'Usuario Temporal', email, password: 'Temporary-User-123!', rol: 'consulta' } });
  assert.equal(created.error, null);
  assert.equal(created.data.ok, true);
  assert.equal(created.data.user.email, email);
  const removed = await admin.functions.invoke('sipro-admin-users', { body: { action: 'delete', id: created.data.user.id } });
  assert.equal(removed.error, null);
  assert.equal(removed.data.ok, true);
});
