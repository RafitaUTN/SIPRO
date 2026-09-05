const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SIPRO_EXPECTED_PROJECT_REF;
const confirmation = process.env.SIPRO_MIGRATION_CONFIRM;
const outputPath = path.resolve(process.env.SIPRO_CREDENTIALS_OUTPUT || 'CREDENCIALES_PRODUCCION.md');
const allowedRoles = new Set(['admin', 'encargado', 'inventario', 'consulta']);

if (!url || !serviceKey || !expectedRef) {
  throw new Error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SIPRO_EXPECTED_PROJECT_REF.');
}
if (new URL(url).hostname !== `${expectedRef}.supabase.co`) {
  throw new Error('La URL no coincide con el proyecto de producción esperado.');
}
if (apply && confirmation !== 'MIGRAR_USUARIOS_PRODUCCION') {
  throw new Error('Para aplicar, define SIPRO_MIGRATION_CONFIRM=MIGRAR_USUARIOS_PRODUCCION.');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const newPassword = () => `Aa1!${crypto.randomBytes(14).toString('base64url')}`;

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function main() {
  const { data: legacyUsers, error: legacyError } = await supabase
    .from('usuarios')
    .select('id,nombre,email,rol')
    .order('id');
  if (legacyError) throw legacyError;
  if (!legacyUsers?.length) throw new Error('No se encontraron usuarios en la tabla heredada.');

  const invalid = legacyUsers.filter(user => !user.nombre || !user.email || !allowedRoles.has(user.rol));
  if (invalid.length) throw new Error(`${invalid.length} usuario(s) tienen nombre, correo o rol inválido.`);

  const duplicateEmails = legacyUsers.filter((user, index, all) =>
    all.findIndex(other => other.email.toLowerCase() === user.email.toLowerCase()) !== index
  );
  if (duplicateEmails.length) throw new Error('La tabla heredada contiene correos duplicados.');

  const authUsers = await listAuthUsers();
  const existingEmails = new Set(authUsers.map(user => user.email?.toLowerCase()).filter(Boolean));
  const conflicts = legacyUsers.filter(user => existingEmails.has(user.email.toLowerCase()));
  const { count: targetProfiles, error: targetError } = await supabase
    .from('sipro_usuarios')
    .select('id', { count: 'exact', head: true });
  if (targetError) throw targetError;

  const preflight = {
    mode: apply ? 'apply' : 'dry-run',
    project: expectedRef,
    legacyUsers: legacyUsers.length,
    roles: legacyUsers.reduce((result, user) => {
      result[user.rol] = (result[user.rol] || 0) + 1;
      return result;
    }, {}),
    authEmailConflicts: conflicts.length,
    existingSiproProfiles: targetProfiles
  };
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);

  if (conflicts.length) {
    throw new Error('Hay correos que ya existen en Auth. No se modificó ningún usuario; revisa los conflictos manualmente.');
  }
  if (targetProfiles !== 0) {
    throw new Error('El destino sipro_usuarios no está vacío. No se modificó ningún usuario para evitar una mezcla accidental.');
  }
  if (!apply) return;

  const createdIds = [];
  const credentials = [];
  try {
    for (const legacyUser of legacyUsers) {
      const password = newPassword();
      const { data, error } = await supabase.auth.admin.createUser({
        email: legacyUser.email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { name: legacyUser.nombre },
        app_metadata: { app: 'sipro', role: legacyUser.rol }
      });
      if (error) throw error;
      createdIds.push(data.user.id);
      credentials.push({ nombre: legacyUser.nombre, email: legacyUser.email.toLowerCase(), password, rol: legacyUser.rol });
    }

    const { count, error: profileError } = await supabase
      .from('sipro_usuarios')
      .select('id', { count: 'exact', head: true });
    if (profileError) throw profileError;
    if (count !== legacyUsers.length) throw new Error('El total de perfiles SIPRO no coincide con los usuarios migrados.');

    const lines = [
      '# Credenciales iniciales de producción de SIPRO',
      '',
      'Generadas durante la migración. Este archivo no debe subirse a Git.',
      'Cada persona debe cambiar su contraseña inicial al recibir la cuenta.',
      '',
      '| Nombre | Correo | Contraseña temporal | Rol |',
      '| --- | --- | --- | --- |',
      ...credentials.map(user => `| ${user.nombre.replaceAll('|', '\\|')} | \`${user.email}\` | \`${user.password}\` | \`${user.rol}\` |`),
      ''
    ];
    fs.writeFileSync(outputPath, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
    process.stdout.write(`Migración completada. Credenciales guardadas localmente en ${outputPath}\n`);
  } catch (error) {
    for (const id of createdIds.reverse()) await supabase.auth.admin.deleteUser(id).catch(() => {});
    throw error;
  }
}

main().catch(error => {
  console.error(`Migración cancelada: ${error.message}`);
  process.exitCode = 1;
});
