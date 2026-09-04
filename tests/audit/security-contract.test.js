const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const usuarioModel = require('../../SRC/db/usuarioModel');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('el DTO de usuario nunca contiene contraseñas ni tokens', () => {
  const dto = usuarioModel.toSafeUser({ id: 1, nombre: 'A', email: 'a@example.invalid', password: 'secret', password_hash: 'hash', access_token: 'token', rol: 'consulta' });
  assert.equal(dto.password, undefined);
  assert.equal(dto.password_hash, undefined);
  assert.equal(dto.access_token, undefined);
});

test('autenticación usa Supabase Auth y no una contraseña de tabla', () => {
  const model = read('SRC/db/usuarioModel.js');
  const migration = read('supabase/migrations/20260903193354_recovered_schema.sql');
  assert.match(model, /auth\.signInWithPassword/);
  assert.doesNotMatch(migration, /password_hash|password\s+varchar/i);
  assert.doesNotMatch(model, /scrypt|\.select\([^)]*password/i);
});

test('las vistas no dependen de CDN ni de Node en el renderer', () => {
  const views = fs.readdirSync(path.join(root, 'SRC/views')).filter(file => file.endsWith('.html'));
  for (const file of views) assert.doesNotMatch(read(`SRC/views/${file}`), /https:\/\/cdn\./, file);
  for (const file of ['login.js', 'appShell.js', 'CRUDPRODUCTO.js', 'CRUDUSUARIO.JS', 'registro.js']) {
    assert.doesNotMatch(read(`SRC/js/${file}`), /require\(['"]electron['"]\)|require\(['"]\.\.\/db/, file);
  }
});

test('Electron aísla el renderer y valida el origen de IPC', () => {
  const source = read('SRC/index.js');
  assert.match(source, /nodeIntegration:\s*false/);
  assert.match(source, /contextIsolation:\s*true/);
  assert.match(source, /sandbox:\s*true/);
  assert.match(source, /setWindowOpenHandler/);
  assert.match(source, /assertTrustedSender/);
  assert.doesNotMatch(source, /contra1234|admin@sistem\.com|auth:bootstrap/);
});

test('la base está aislada, usa RLS y el stock se modifica atómicamente', () => {
  const sql = read('supabase/migrations/20260903193354_recovered_schema.sql');
  assert.match(sql, /create table public\.sipro_usuarios/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /auth\.jwt\(\) -> 'app_metadata'/);
  assert.match(sql, /stock >= p_cantidad/);
  assert.match(sql, /check \(stock >= 0\)/);
  assert.doesNotMatch(sql, /create table public\.(usuarios|productos|categorias)\s/i);
});

test('ningún secreto de servicio se usa en el runtime de la aplicación', () => {
  const runtime = [read('SRC/db/supabaseClient.js'), read('SRC/index.js'), read('forge.config.js')].join('\n');
  assert.doesNotMatch(runtime, /SERVICE_ROLE|sb_secret_/i);
  const forge = read('forge.config.js');
  assert.match(forge, /CREDENCIALES_ACCESO/);
  assert.match(forge, /\\\.env/);
  assert.match(forge, /supabase/);
});
