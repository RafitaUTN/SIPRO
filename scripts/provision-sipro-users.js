const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawUsers = process.env.SIPRO_USERS_JSON;
if (!url || !serviceKey || !rawUsers) throw new Error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SIPRO_USERS_JSON');

const users = JSON.parse(rawUsers);
const roles = new Set(['admin', 'encargado', 'inventario', 'consulta']);
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  for (const user of users) {
    if (!roles.has(user.rol) || typeof user.password !== 'string' || user.password.length < 12) throw new Error(`Usuario inválido: ${user.email}`);
    const found = existing.users.find(item => item.email?.toLowerCase() === user.email.toLowerCase());
    const attributes = {
      email: user.email.toLowerCase(), password: user.password, email_confirm: true,
      user_metadata: { name: user.nombre }, app_metadata: { app: 'sipro', role: user.rol }
    };
    if (found) {
      if (found.app_metadata?.app !== 'sipro') throw new Error(`El correo ${user.email} pertenece a otra aplicación`);
      const { error } = await supabase.auth.admin.updateUserById(found.id, attributes);
      if (error) throw error;
      process.stdout.write(`actualizado ${user.email}\n`);
    } else {
      const { error } = await supabase.auth.admin.createUser(attributes);
      if (error) throw error;
      process.stdout.write(`creado ${user.email}\n`);
    }
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
