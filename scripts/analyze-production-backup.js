const fs = require('node:fs');
const path = require('node:path');

const backupPath = path.resolve(process.argv[2] || '');
if (!backupPath || !fs.existsSync(backupPath)) {
  throw new Error('Indica la ruta de un respaldo SQL existente.');
}

const sql = fs.readFileSync(backupPath, 'utf8');

function copyRows(table) {
  const pattern = new RegExp(`COPY ${table.replace('.', '\\.') } \\(([^)]+)\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\r?\\n\\\\\\.`, 'm');
  const match = sql.match(pattern);
  if (!match) return { columns: [], rows: [] };
  const columns = match[1].split(',').map(value => value.trim());
  const rows = match[2] ? match[2].split(/\r?\n/).map(line => {
    const values = line.split('\t').map(value => value === '\\N' ? null : value);
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  }) : [];
  return { columns, rows };
}

const categories = copyRows('public.categorias').rows;
const products = copyRows('public.productos').rows;
const movements = copyRows('public.movimientos_stock').rows;
const users = copyRows('public.usuarios').rows;
const authUsers = copyRows('auth.users').rows;
const authEmails = new Set(authUsers.map(row => String(row.email || '').toLowerCase()).filter(Boolean));

const categoryIds = new Set(categories.map(row => row.id));
const productIds = new Set(products.map(row => row.id));
const barcodeCounts = new Map();
for (const row of products) barcodeCounts.set(row.codigodebarra, (barcodeCounts.get(row.codigodebarra) || 0) + 1);

const passwordFormats = {};
for (const row of users) {
  const password = row.password || '';
  const format = /^\$2[aby]\$/.test(password)
    ? 'bcrypt'
    : /^\$argon2/.test(password)
      ? 'argon2'
      : /^[a-f0-9]{64}$/i.test(password)
        ? 'sha256_o_similar'
        : 'texto_o_formato_desconocido';
  passwordFormats[format] = (passwordFormats[format] || 0) + 1;
}

const report = {
  source: path.basename(backupPath),
  bytes: fs.statSync(backupPath).size,
  format: sql.includes('PostgreSQL database cluster dump') ? 'postgres_cluster_plain_sql' : 'plain_sql',
  includesSensitiveSchemas: ['auth', 'storage', 'vault'].filter(schema => new RegExp(`COPY ${schema}\\.`).test(sql)),
  publicTables: [...sql.matchAll(/^CREATE TABLE public\.([^ (]+)/gm)].map(match => match[1]),
  rowCounts: {
    categories: categories.length,
    products: products.length,
    movements: movements.length,
    legacyUsers: users.length,
    authUsers: authUsers.length
  },
  integrity: {
    duplicateBarcodes: [...barcodeCounts.values()].filter(count => count > 1).length,
    productsWithoutCategory: products.filter(row => !categoryIds.has(row.categoria_id)).length,
    movementsWithoutProduct: movements.filter(row => row.producto_id && !productIds.has(row.producto_id)).length,
    invalidMovementQuantities: movements.filter(row => !Number.isInteger(Number(row.cantidad)) || Number(row.cantidad) <= 0).length,
    negativeStockProducts: products.filter(row => Number(row.stock) < 0).length
  },
  legacyRoles: users.reduce((roles, row) => {
    const role = row.rol || '(vacío)';
    roles[role] = (roles[role] || 0) + 1;
    return roles;
  }, {}),
  movementTypes: movements.reduce((types, row) => {
    const type = row.tipo_movimiento || '(vacío)';
    types[type] = (types[type] || 0) + 1;
    return types;
  }, {}),
  legacyUserEmailConflictsWithAuth: users.filter(row => authEmails.has(String(row.email || '').toLowerCase())).length,
  legacyPasswordFormats: passwordFormats,
  publicRlsEnabled: ['categorias', 'productos', 'movimientos_stock', 'usuarios'].reduce((result, table) => {
    result[table] = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i').test(sql);
    return result;
  }, {})
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
