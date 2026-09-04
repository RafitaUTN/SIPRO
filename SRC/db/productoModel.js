// db/productoModel.js - Adaptado para Supabase
const { getSupabase } = require('./supabaseClient');
const supabase = getSupabase();

const mapProducto = (p) => ({ ...p, categoria: p.sipro_categorias ? p.sipro_categorias.nombre : 'Sin categoría' });

const normalizarPaginacion = ({ page = 1, pageSize = 10 } = {}) => ({
  page: Math.max(1, Number(page) || 1),
  pageSize: Math.min(100, Math.max(1, Number(pageSize) || 10))
});
const normalizarBusqueda = value => String(value || '').replace(/[,().%]/g, ' ').trim().slice(0, 100);

const getAllProductos = async (options = {}) => {
  const { page, pageSize } = normalizarPaginacion(options);
  const from = (page - 1) * pageSize;
  let query = supabase
    .from('sipro_productos')
    .select('id, codigodebarra, nombre, precio, stock, stock_minimo, categoria_id, sipro_categorias(nombre)', { count: 'exact' })
    .order('id', { ascending: true });
  const search = normalizarBusqueda(options.search);
  if (search) {
    const { data: matchingCategories, error: categoryError } = await supabase.from('sipro_categorias').select('id').ilike('nombre', `%${search}%`);
    if (categoryError) throw categoryError;
    const categoryFilter = (matchingCategories || []).map(category => category.id).join(',');
    const filters = [`nombre.ilike.%${search}%`, `codigodebarra.ilike.%${search}%`];
    if (categoryFilter) filters.push(`categoria_id.in.(${categoryFilter})`);
    query = query.or(filters.join(','));
  }
  if (options.categoryId) query = query.eq('categoria_id', options.categoryId);
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  const total = count || 0;
  return { data: (data || []).map(mapProducto), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

const getDashboardStats = async () => {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const [productos, usuarios, movimientos] = await Promise.all([
    supabase.from('sipro_productos').select('id,stock,stock_minimo').eq('activo', true),
    supabase.from('sipro_usuarios').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('sipro_movimientos_stock').select('id', { count: 'exact', head: true }).gte('fecha', inicio.toISOString())
  ]);
  for (const result of [productos, usuarios, movimientos]) if (result.error) throw result.error;
  return { totalProductos: productos.data.length, totalUsuarios: usuarios.count || 0, stockBajo: productos.data.filter(p => p.stock <= p.stock_minimo).length, totalMovimientos: movimientos.count || 0 };
};

const getProductosConVentas = async () => {
  const { data, error } = await supabase
    .from('sipro_productos')
    .select('id, codigodebarra, nombre, precio, stock, stock_minimo, categoria_id, sipro_categorias(nombre)')
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map(mapProducto);
};

const getIngresosPorMes = async () => {
  // Función de reporte - se necesitaría una RPC en Supabase
  return [];
};

const getProductosInventario = async () => {
  const { data, error } = await supabase
    .from('sipro_productos')
    .select('id, codigodebarra, nombre, precio, stock, stock_minimo, categoria_id, sipro_categorias(nombre)')
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map(mapProducto);
};

const getProductoById = async (id) => {
  const { data, error } = await supabase
    .from('sipro_productos')
    .select('id, codigodebarra, nombre, precio, stock, stock_minimo, categoria_id, sipro_categorias(nombre)')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    return mapProducto(data);
  }
  return null;
};

const createProducto = async ({ codigodebarra, nombre, precio, stock, categoria_id, stock_minimo = 10 }) => {
  const { data, error } = await supabase.rpc('sipro_crear_producto', {
    p_codigodebarra: codigodebarra, p_nombre: nombre, p_precio: precio,
    p_stock: stock, p_categoria_id: categoria_id, p_stock_minimo: stock_minimo
  });

  if (error) throw error;
  return data;
};

const updateProducto = async (id, { codigodebarra, nombre, precio, categoria_id, stock_minimo = 10 }) => {
  const { data, error } = await supabase
    .from('sipro_productos')
    .update({ codigodebarra, nombre, precio, categoria_id, stock_minimo, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const hasMovimientos = async (id) => {
  const { data, error, count } = await supabase
    .from('sipro_movimientos_stock')
    .select('id', { count: 'exact', head: true })
    .eq('producto_id', id);

  if (error) throw error;
  return (count || 0) > 0;
};

const getProductoByCodigo = async (codigo) => {
  const { data, error } = await supabase
    .from('sipro_productos')
    .select('id, codigodebarra, nombre, precio, stock, stock_minimo, categoria_id, sipro_categorias(nombre)')
    .eq('codigodebarra', codigo)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    return mapProducto(data);
  }
  return null;
};

const deleteProductoDesvincular = async (id) => {
  const { error: deleteError } = await supabase
    .from('sipro_productos')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
};

const deleteProducto = async (id) => {
  const { error } = await supabase
    .from('sipro_productos')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

const getAllCategorias = async () => {
  const { data, error } = await supabase
    .from('sipro_categorias')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
};

const entradaProducto = async (id, cantidad) => {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');
  const { data, error } = await supabase.rpc('sipro_ajustar_stock', { p_producto_id: id, p_cantidad: cantidad, p_tipo: 'entrada' });
  if (error) throw error;
  return data;
};

const salidaProducto = async (id, cantidad) => {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');
  const { data, error } = await supabase.rpc('sipro_ajustar_stock', { p_producto_id: id, p_cantidad: cantidad, p_tipo: 'salida' });
  if (error) {
    if (error.code === 'P0001') return null;
    throw error;
  }
  return data;
};

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getAllCategorias,
  entradaProducto,
  salidaProducto,
  hasMovimientos,
  deleteProductoDesvincular,
  getProductosConVentas,
  getIngresosPorMes,
  getProductosInventario,
  getProductoByCodigo,
  getDashboardStats
};
