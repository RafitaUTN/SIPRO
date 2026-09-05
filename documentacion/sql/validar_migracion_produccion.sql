-- Consultas de solo lectura para aprobar la migración antes de cambiar la aplicación.
select 'categorias' as entidad,
       (select count(*) from public.categorias) as origen,
       (select count(*) from public.sipro_categorias) as destino
union all
select 'productos',
       (select count(*) from public.productos),
       (select count(*) from public.sipro_productos)
union all
select 'movimientos',
       (select count(*) from public.movimientos_stock),
       (select count(*) from public.sipro_movimientos_stock);

select count(*) as productos_con_diferencia
from public.productos origen
join public.sipro_productos destino on destino.id = origen.id
where destino.codigodebarra <> origen.codigodebarra
   or destino.nombre <> origen.nombre
   or destino.precio <> origen.precio
   or destino.stock <> origen.stock
   or destino.categoria_id <> origen.categoria_id;

select count(*) as movimientos_con_diferencia
from public.movimientos_stock origen
join public.sipro_movimientos_stock destino on destino.id = origen.id
where destino.producto_id is distinct from origen.producto_id
   or destino.tipo_movimiento <> lower(origen.tipo_movimiento)
   or destino.cantidad <> origen.cantidad;

select count(*) as productos_huerfanos
from public.sipro_productos producto
left join public.sipro_categorias categoria on categoria.id = producto.categoria_id
where categoria.id is null;

select count(*) as movimientos_huerfanos
from public.sipro_movimientos_stock movimiento
left join public.sipro_productos producto on producto.id = movimiento.producto_id
where movimiento.producto_id is not null and producto.id is null;
