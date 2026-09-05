const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const expectedRef = 'ndrcwqcqtymcjhkcscdp';
const expectedHost = `${expectedRef}.supabase.co`;
const projectRoot = path.resolve(__dirname, '..');
const backupRoot = path.resolve(projectRoot, 'BD_SUPABASE_PRODUCCION');
const tables = ['categorias', 'productos', 'movimientos_stock', 'usuarios'];
const pageSize = 1000;

if (!process.argv.includes('--confirm-readonly-backup')) {
  throw new Error('Falta --confirm-readonly-backup. El script solo realiza lecturas y crea un archivo local.');
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env.');
}
if (new URL(process.env.SUPABASE_URL).hostname !== expectedHost) {
  throw new Error(`La configuración no apunta al proyecto esperado ${expectedRef}.`);
}
if (!backupRoot.startsWith(`${projectRoot}${path.sep}`)) {
  throw new Error('La carpeta de respaldo no pertenece al proyecto.');
}

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function readAll(table) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function main() {
  const capturedAt = new Date().toISOString();
  const data = {};
  for (const table of tables) data[table] = await readAll(table);

  const payload = {
    format: 'sipro-public-logical-backup-v1',
    project_ref: expectedRef,
    captured_at_utc: capturedAt,
    warning: 'Contiene datos sensibles. No subir a Git ni compartir.',
    row_counts: Object.fromEntries(tables.map(table => [table, data[table].length])),
    data
  };
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
  const stamp = capturedAt.replace(/[:.]/g, '-');
  const fileName = `sipro-public-${stamp}.json`;
  const filePath = path.join(backupRoot, fileName);
  const checksumPath = `${filePath}.sha256`;

  fs.mkdirSync(backupRoot, { recursive: true });
  fs.writeFileSync(filePath, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.writeFileSync(checksumPath, `${checksum}  ${fileName}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  const verification = fs.readFileSync(filePath);
  const verifiedChecksum = crypto.createHash('sha256').update(verification).digest('hex');
  if (verifiedChecksum !== checksum) throw new Error('Falló la verificación SHA-256 del respaldo.');

  process.stdout.write(`${JSON.stringify({
    project_ref: expectedRef,
    file: filePath,
    checksum_file: checksumPath,
    bytes: verification.length,
    sha256: checksum,
    row_counts: payload.row_counts,
    verified: true
  }, null, 2)}\n`);
}

main().catch(error => {
  console.error(`Respaldo cancelado: ${error.message}`);
  process.exitCode = 1;
});
