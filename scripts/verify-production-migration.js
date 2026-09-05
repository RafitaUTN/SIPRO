const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const expectedRef = 'ndrcwqcqtymcjhkcscdp';
const root = path.resolve(__dirname, '..');
const backupDir = path.join(root, 'BD_SUPABASE_PRODUCCION');

if (new URL(process.env.SUPABASE_URL || 'http://invalid').hostname !== `${expectedRef}.supabase.co`) {
  throw new Error('La configuración no apunta a la producción autorizada.');
}

const backupFile = fs.readdirSync(backupDir)
  .filter(file => /^sipro-public-.*\.json$/.test(file))
  .sort()
  .at(-1);
if (!backupFile) throw new Error('No existe un respaldo público actual para validar.');
const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), 'utf8'));
if (snapshot.project_ref !== expectedRef) throw new Error('El respaldo pertenece a otro proyecto.');

const makeClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function exactCount(client, table) {
  const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function main() {
  const anonymous = makeClient();
  const anonymousRead = await anonymous.from('sipro_productos').select('id').limit(1);
  const deniedByGrant = anonymousRead.error?.code === '42501';
  const deniedByRls = !anonymousRead.error && anonymousRead.data.length === 0;
  if (!deniedByGrant && !deniedByRls) {
    throw new Error('RLS no bloqueó la lectura anónima del inventario nuevo.');
  }
  const keepalive = await anonymous.rpc('keepalive');
  if (keepalive.error || keepalive.data !== 1) throw new Error('Falló keepalive().');

  const loginResults = [];
  let adminClient;
  for (const legacyUser of snapshot.data.usuarios) {
    const client = makeClient();
    const login = await client.auth.signInWithPassword({
      email: legacyUser.email.toLowerCase(),
      password: legacyUser.password
    });
    if (login.error) throw new Error(`Falló el acceso migrado del usuario ${legacyUser.id}: ${login.error.message}`);
    const profile = await client.from('sipro_usuarios')
      .select('id,nombre,email,rol,activo')
      .eq('auth_user_id', login.data.user.id)
      .single();
    if (profile.error || !profile.data.activo || profile.data.email !== legacyUser.email.toLowerCase()) {
      throw new Error(`El perfil migrado del usuario ${legacyUser.id} no coincide.`);
    }
    loginResults.push({ legacy_id: legacyUser.id, role: profile.data.rol, ok: true });
    if (!adminClient && profile.data.rol === 'admin') adminClient = client;
    else await client.auth.signOut();
  }
  if (!adminClient) throw new Error('No existe una cuenta administrativa para verificar usuarios.');

  const counts = {
    categorias: await exactCount(adminClient, 'sipro_categorias'),
    productos: await exactCount(adminClient, 'sipro_productos'),
    movimientos_stock: await exactCount(adminClient, 'sipro_movimientos_stock'),
    usuarios: await exactCount(adminClient, 'sipro_usuarios')
  };
  const rowsAddedSinceBackup = {};
  for (const [table, expected] of Object.entries(snapshot.row_counts)) {
    if (counts[table] < expected) {
      throw new Error(`El total de ${table} disminuyó respecto al respaldo: ${counts[table]} < ${expected}`);
    }
    rowsAddedSinceBackup[table] = counts[table] - expected;
  }

  const marker = crypto.randomUUID();
  const temporaryEmail = `verificacion-${marker}@example.invalid`;
  const created = await adminClient.functions.invoke('sipro-admin-users', {
    body: {
      action: 'create', nombre: 'Verificación temporal', email: temporaryEmail,
      password: `Tmp!${marker}`, rol: 'consulta'
    }
  });
  if (created.error || !created.data?.ok) throw new Error(`No se pudo crear el usuario temporal: ${created.error?.message || created.data?.error}`);
  const removed = await adminClient.functions.invoke('sipro-admin-users', {
    body: { action: 'delete', id: created.data.user.id }
  });
  if (removed.error || !removed.data?.ok) throw new Error(`No se pudo eliminar el usuario temporal: ${removed.error?.message || removed.data?.error}`);
  const residual = await adminClient.from('sipro_usuarios').select('id').eq('email', temporaryEmail);
  if (residual.error || residual.data.length) throw new Error('Quedó un perfil temporal después de la prueba.');
  await adminClient.auth.signOut();

  process.stdout.write(`${JSON.stringify({
    project_ref: expectedRef,
    backup: backupFile,
    anonymous_rls_blocked: true,
    keepalive: 1,
    migrated_logins: loginResults,
    counts,
    admin_user_lifecycle: 'create/delete PASS',
    baseline_rows_not_lost: true,
    rows_added_since_backup: rowsAddedSinceBackup
  }, null, 2)}\n`);
}

main().catch(error => {
  console.error(`Verificación fallida: ${error.message}`);
  process.exitCode = 1;
});
