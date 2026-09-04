const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const users = JSON.parse(process.env.SIPRO_USERS_JSON || '[]');

if (url !== 'https://mopgfccvkfyhccvzxmoe.supabase.co' || !key || users.length !== 4) {
  throw new Error('Configuración remota SIPRO incompleta o proyecto inesperado');
}

const client = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function signIn(user) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  assert.ifError(error);
  assert.equal(data.user.app_metadata.app, 'sipro');
  assert.equal(data.user.app_metadata.role, user.rol);
  return supabase;
}

async function main() {
  const anonymous = client();
  const { data: anonymousProducts, error: anonymousError } = await anonymous
    .from('sipro_productos').select('id').limit(1);
  assert.ok(anonymousError || anonymousProducts.length === 0, 'RLS permitió lectura anónima');

  const sessions = new Map();
  for (const user of users) {
    const supabase = await signIn(user);
    sessions.set(user.rol, supabase);
    const { data, error, count } = await supabase.from('sipro_productos')
      .select('id,nombre,stock', { count: 'exact' }).limit(25);
    assert.ifError(error);
    assert.equal(count, 20);
    assert.equal(data.length, 20);
  }

  const consulta = sessions.get('consulta');
  const { error: denied } = await consulta.rpc('sipro_ajustar_stock', {
    p_producto_id: 1, p_cantidad: 1, p_tipo: 'entrada', p_nota: 'Debe ser rechazado'
  });
  assert.ok(denied, 'El rol consulta pudo modificar inventario');

  const admin = sessions.get('admin');
  const { count: categories, error: categoriesError } = await admin
    .from('sipro_categorias').select('id', { count: 'exact', head: true });
  assert.ifError(categoriesError);
  assert.equal(categories, 8);
  const { data: profiles, error: profilesError, count: profileCount } = await admin
    .from('sipro_usuarios').select('id,email', { count: 'exact' });
  assert.ifError(profilesError);
  assert.equal(profileCount, 4);

  const inventory = sessions.get('inventario');
  const { data: selected, error: selectedError } = await inventory
    .from('sipro_productos').select('id,stock').order('id').limit(1).single();
  assert.ifError(selectedError);
  const originalStock = selected.stock;
  const note = `Verificación remota reversible ${new Date().toISOString()}`;
  const { error: entryError } = await inventory.rpc('sipro_ajustar_stock', {
    p_producto_id: selected.id, p_cantidad: 1, p_tipo: 'entrada', p_nota: note
  });
  assert.ifError(entryError);
  const { data: restored, error: exitError } = await inventory.rpc('sipro_ajustar_stock', {
    p_producto_id: selected.id, p_cantidad: 1, p_tipo: 'salida', p_nota: note
  });
  assert.ifError(exitError);
  assert.equal(restored.stock, originalStock);

  // El proyecto compartido tiene un límite configurado de cinco cuentas Auth
  // (una de la otra aplicación y cuatro de SIPRO). Verificamos la función con
  // una actualización idempotente para no ocupar ni alterar cuentas ajenas.
  const consultationProfile = profiles.find(profile => profile.email === 'consulta.sipro@hotel-silencio.invalid');
  assert.ok(consultationProfile);
  const { data: updated, error: updateError } = await admin.functions.invoke('sipro-admin-users', {
    body: {
      action: 'update', id: consultationProfile.id, nombre: 'Consulta SIPRO',
      email: consultationProfile.email, rol: 'consulta', activo: true
    }
  });
  assert.ifError(updateError);
  assert.equal(updated.ok, true);
  assert.equal(updated.user.email, consultationProfile.email);

  const { count: movements, error: movementsError } = await admin
    .from('sipro_movimientos_stock').select('id', { count: 'exact', head: true });
  assert.ifError(movementsError);
  assert.ok(movements >= 22);
  process.stdout.write(JSON.stringify({
    project: 'mopgfccvkfyhccvzxmoe', usersVerified: 4, categories,
    products: 20, movements, anonymousReadBlocked: true,
    consultationWriteBlocked: true, stockRestored: true,
    edgeFunctionUpdateVerified: true, authProjectLimitReached: '5/5'
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
