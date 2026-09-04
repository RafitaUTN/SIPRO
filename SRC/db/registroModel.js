// db/registroModel.js - Adaptado para Supabase
const { getSupabase } = require('./supabaseClient');
const supabase = getSupabase();
const normalizarBusqueda = value => String(value || '').replace(/[,().%]/g, ' ').trim().slice(0, 100);

// Obtener todos los movimientos con información de productos y categorías
const getAllMovimientos = async (options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 10));
  let query = supabase
    .from('sipro_movimientos_stock')
    .select(`
       id, tipo_movimiento, cantidad, fecha, producto_id,
       sipro_productos(id, nombre, codigodebarra, categoria_id, sipro_categorias(nombre))
    `, { count: 'exact' });
  const search = normalizarBusqueda(options.search);
  if (search || options.categoryId) {
    let productsQuery = supabase.from('sipro_productos').select('id');
    if (search) productsQuery = productsQuery.or(`nombre.ilike.%${search}%,codigodebarra.ilike.%${search}%`);
    if (options.categoryId) productsQuery = productsQuery.eq('categoria_id', options.categoryId);
    const { data: matchingProducts, error: productsError } = await productsQuery;
    if (productsError) throw productsError;
    const ids = (matchingProducts || []).map(product => product.id);
    query = ids.length ? query.in('producto_id', ids) : query.eq('producto_id', -1);
  }
  if (options.productId) query = query.eq('producto_id', options.productId);
  if (options.type) query = query.eq('tipo_movimiento', options.type);
  query = query.order('fecha', { ascending: false });
  if (options.from) query = query.gte('fecha', `${options.from}T00:00:00.000Z`);
  if (options.to) query = query.lte('fecha', `${options.to}T23:59:59.999Z`);
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;

  // Mapear datos para facilitar el acceso a la información
  const rows = (data || []).map(m => ({
    id: m.id,
    tipo_movimiento: m.tipo_movimiento,
    cantidad: m.cantidad,
    fecha: m.fecha,
    producto_id: m.producto_id,
    producto: m.sipro_productos ? m.sipro_productos.nombre : m.producto_nombre || 'Producto eliminado',
    codigodebarra: m.sipro_productos ? m.sipro_productos.codigodebarra : '-',
    categoria: m.sipro_productos && m.sipro_productos.sipro_categorias ? m.sipro_productos.sipro_categorias.nombre : '-'
  }));
  return { data: rows, total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
};

// Exportar a Excel
const exportarExcelMovimientos = async (rutaArchivo, movimientos) => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Movimientos');

  // Congela encabezados y permite filtrar columnas
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:G1';

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Código de Barra', key: 'codigodebarra', width: 20 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Categoría', key: 'categoria', width: 25 },
    { header: 'Tipo', key: 'tipo_movimiento', width: 15 },
    { header: 'Cantidad', key: 'cantidad', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 25 },
  ];

  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  movimientos.forEach(m => {
    sheet.addRow({
      id: m.id,
      codigodebarra: m.codigodebarra || '-',
      producto: m.producto,
      categoria: m.categoria || '-',
      tipo_movimiento: m.tipo_movimiento,
      cantidad: m.cantidad,
      fecha: new Date(m.fecha).toLocaleString(),
    });
  });

  await workbook.xlsx.writeFile(rutaArchivo);
  return rutaArchivo;
};
module.exports = { getAllMovimientos, exportarExcelMovimientos };
