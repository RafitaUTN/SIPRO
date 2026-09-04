const ExcelJS = require('exceljs');
const { getSupabase } = require('./supabaseClient');
const supabase = getSupabase();

async function exportarProductosExcel(rutaArchivo) {

  // Consulta los productos desde Supabase con categorías y movimientos
  const { data: productos, error } = await supabase
    .from('sipro_productos')
    .select(`
      id,
      codigodebarra,
      nombre,
      stock,
      categoria_id,
      stock_minimo,
      sipro_categorias(nombre),
      sipro_movimientos_stock(tipo_movimiento, cantidad)
    `);

  if (error) throw error;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventario');

  // Congela encabezados y agrega autofiltro para una vista más profesional
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:F1';

  // Encabezados
  sheet.columns = [
    { header: 'Código de Barra', key: 'codigodebarra', width: 25 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Categoria', key: 'categoria', width: 30 },
    { header: 'Entradas', key: 'entradas', width: 15 },
    { header: 'Salidas', key: 'salidas', width: 15 },
    { header: 'Stock Actual', key: 'stock', width: 15 }
  ];

  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Agregar filas de productos
  productos.forEach(p => {
    // Obtener nombre de categoría
    const nombreCategoria = p.sipro_categorias ? p.sipro_categorias.nombre : 'Sin categoría';

    // Calcular entradas y salidas
    let entradas = 0;
    let salidas = 0;

    if (p.sipro_movimientos_stock && Array.isArray(p.sipro_movimientos_stock)) {
      p.sipro_movimientos_stock.forEach(mov => {
        if (mov.tipo_movimiento === 'entrada') {
          entradas += mov.cantidad;
        } else if (mov.tipo_movimiento === 'salida') {
          salidas += mov.cantidad;
        }
      });
    }

    const row = sheet.addRow({
      codigodebarra: p.codigodebarra,
      nombre: p.nombre,
      categoria: nombreCategoria,
      entradas: entradas,
      salidas: salidas,
      stock: p.stock
    });

    // Colorear stock
    let fillColor = '';
    if (p.stock <= p.stock_minimo) fillColor = 'FF6347';
    else if (p.stock <= p.stock_minimo + 5) fillColor = 'FFD700';
    else fillColor = '90EE90';

    row.getCell('stock').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };

    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });
  });

  // Guardar archivo en la ruta proporcionada
  await workbook.xlsx.writeFile(rutaArchivo);
  console.log(`✅ Inventario generado en: ${rutaArchivo}`);
  return rutaArchivo;
}

module.exports = { exportarProductosExcel };
