const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backupDir = path.join(root, 'BD_SUPABASE_PRODUCCION');
const output = path.join(root, 'CREDENCIALES_PRODUCCION.md');
const backupFile = fs.readdirSync(backupDir)
  .filter(file => /^sipro-public-.*\.json$/.test(file))
  .sort()
  .at(-1);
if (!backupFile) throw new Error('No existe el respaldo actual de producción.');
const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), 'utf8'));
if (snapshot.project_ref !== 'ndrcwqcqtymcjhkcscdp') throw new Error('El respaldo pertenece a otro proyecto.');

const escapeCell = value => String(value).replaceAll('|', '\\|');
const lines = [
  '# Credenciales actuales de producción de SIPRO',
  '',
  'Migradas a Supabase Auth desde la versión anterior. Este archivo está excluido de Git.',
  'Las contraseñas heredadas son cortas; deben cambiarse por claves únicas de al menos 12 caracteres.',
  '',
  '| Nombre | Correo | Contraseña actual | Rol |',
  '| --- | --- | --- | --- |',
  ...snapshot.data.usuarios.map(user =>
    `| ${escapeCell(user.nombre)} | \`${user.email}\` | \`${user.password}\` | \`${user.rol}\` |`
  ),
  ''
];
fs.writeFileSync(output, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
process.stdout.write(`Credenciales guardadas localmente en ${output}\n`);
