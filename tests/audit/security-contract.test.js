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

test('la distribución usa identidad visual propia y el keep-alive ejecuta SELECT 1 cada seis horas', () => {
  const forge = read('forge.config.js');
  const main = read('SRC/index.js');
  const workflow = read('.github/workflows/supabase-keepalive.yml');
  const css = `${read('SRC/css/vendor.css')}\n${read('SRC/css/panelPrincipal.css')}`;
  assert.match(forge, /favicon\.ico/);
  assert.match(forge, /setupIcon/);
  assert.match(main, /favicon\.ico/);
  assert.match(main, /!squirrelStartup/);
  assert.match(workflow, /17 \*\/6 \* \* \*/);
  assert.match(workflow, /rpc\/keepalive/);
  assert.match(css, /z-index:\s*300/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /font-size:15px/);
});

test('los errores técnicos se convierten en mensajes claros para la persona usuaria', () => {
  const { mensajeParaUsuario } = require('../../SRC/helpers/notificaciones');
  assert.equal(
    mensajeParaUsuario("Error invoking remote method 'usuarios:create': Error: La contraseña debe tener al menos 12 caracteres."),
    'La contraseña debe tener al menos 12 caracteres.'
  );
  assert.equal(
    mensajeParaUsuario({ message: 'PostgrestError PGRST116 stack at request', code: 'PGRST116' }),
    'No fue posible completar la operación. Inténtalo de nuevo.'
  );
});

test('la navegación prepara la vista sin pantalla blanca y la actualización usa el modal SIPRO', () => {
  const shell = read('SRC/js/appShell.js');
  const updater = read('SRC/helpers/autoUpdater.js');
  assert.match(shell, /const viewCache = new Map/);
  assert.match(shell, /await ensureStyles\(doc\)/);
  assert.match(shell, /logo hotel\.png/);
  assert.match(shell, /Instalar ahora/);
  assert.match(shell, /Más tarde/);
  assert.doesNotMatch(shell, /Cargando módulo/);
  assert.match(updater, /onNotifyUser/);
  assert.match(updater, /quitAndInstall/);
  assert.doesNotMatch(updater, /makeUserNotifier/);
});

test('el respaldo programado cifra datos y la migración nunca sobrescribe el legado', () => {
  const workflow = read('.github/workflows/database-backup.yml');
  const migration = read('documentacion/sql/migrar_inventario_legacy.sql');
  const ignore = read('.gitignore');
  assert.match(workflow, /gpg --batch --yes --symmetric --cipher-algo AES256/);
  assert.match(workflow, /retention-days:\s*14/);
  assert.match(workflow, /path:\s*\$\{\{ steps\.backup\.outputs\.archive \}\}/);
  assert.match(workflow, /sipro_categorias sipro_productos sipro_movimientos_stock sipro_usuarios/);
  assert.match(workflow, /auth\/v1\/token\?grant_type=password/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /destino sipro_\* debe estar vacío/i);
  assert.doesNotMatch(migration, /(?:delete\s+from|truncate|drop\s+table|update)\s+public\.(?:usuarios|categorias|productos|movimientos_stock)\b/i);
  assert.match(ignore, /BD_SUPABASE_PRODUCCION\//);
  assert.match(ignore, /CREDENCIALES_PRODUCCION\.md/);
});

test('la distribución 1.2.2 apunta únicamente al proyecto de producción autorizado', () => {
  const env = read('SRC/helpers/loadEnv.js');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '1.2.2');
  assert.match(env, /ndrcwqcqtymcjhkcscdp\.supabase\.co/);
  assert.match(env, /sb_publishable_/);
  assert.doesNotMatch(env, /mopgfccvkfyhccvzxmoe/);
  assert.doesNotMatch(env, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]|sb_secret_/i);
});

test('la identidad visual muestra el nombre completo del hotel', () => {
  const login = read('SRC/views/index.html');
  const panel = read('SRC/views/panelPrincipal.html');

  assert.match(login, /<title>Hotel El Silencio del Campo \| Sistema de inventario<\/title>/);
  assert.match(login, /<strong>Hotel El Silencio del Campo<\/strong>/);
  assert.match(panel, /<strong>Hotel El Silencio del Campo<\/strong>/);
});
