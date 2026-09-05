-- Ejecutar únicamente después de crear y auditar el esquema seguro sipro_*.
-- No elimina ni actualiza las tablas legacy. Falla si el destino ya tiene datos.
begin;

select pg_advisory_xact_lock(hashtext('sipro_migracion_inventario_legacy_v1'));

do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'public.categorias', 'public.productos', 'public.movimientos_stock',
    'public.sipro_categorias', 'public.sipro_productos', 'public.sipro_movimientos_stock'
  ] loop
    if to_regclass(required_table) is null then
      raise exception 'Falta la tabla requerida %', required_table;
    end if;
  end loop;

  if exists (select 1 from public.sipro_categorias)
     or exists (select 1 from public.sipro_productos)
     or exists (select 1 from public.sipro_movimientos_stock) then
    raise exception 'El destino sipro_* debe estar vacío para evitar mezclar o sobrescribir datos';
  end if;
end;
$$;

insert into public.sipro_categorias (id, nombre, activo, creado_en)
select id::bigint, trim(nombre), true, now()
from public.categorias
order by id;

insert into public.sipro_productos
  (id, codigodebarra, nombre, precio, categoria_id, stock, stock_minimo, activo, creado_en, actualizado_en)
select
  id::bigint,
  trim(codigodebarra),
  trim(nombre),
  precio,
  categoria_id::bigint,
  stock,
  10,
  true,
  creado_en at time zone 'UTC',
  creado_en at time zone 'UTC'
from public.productos
order by id;

insert into public.sipro_movimientos_stock
  (id, producto_id, producto_nombre, tipo_movimiento, cantidad, usuario_id, nota, fecha)
select
  movimiento.id::bigint,
  movimiento.producto_id::bigint,
  coalesce(producto.nombre, 'Producto eliminado'),
  lower(movimiento.tipo_movimiento),
  movimiento.cantidad,
  null,
  'Migrado desde la versión anterior de SIPRO',
  movimiento.fecha at time zone 'UTC'
from public.movimientos_stock movimiento
left join public.productos producto on producto.id = movimiento.producto_id
order by movimiento.id;

select setval(
  pg_get_serial_sequence('public.sipro_categorias', 'id'),
  coalesce(max(id), 1),
  count(*) > 0
) from public.sipro_categorias;

select setval(
  pg_get_serial_sequence('public.sipro_productos', 'id'),
  coalesce(max(id), 1),
  count(*) > 0
) from public.sipro_productos;

select setval(
  pg_get_serial_sequence('public.sipro_movimientos_stock', 'id'),
  coalesce(max(id), 1),
  count(*) > 0
) from public.sipro_movimientos_stock;

do $$
begin
  if (select count(*) from public.sipro_categorias) <> (select count(*) from public.categorias) then
    raise exception 'Falló la validación del total de categorías';
  end if;
  if (select count(*) from public.sipro_productos) <> (select count(*) from public.productos) then
    raise exception 'Falló la validación del total de productos';
  end if;
  if (select count(*) from public.sipro_movimientos_stock) <> (select count(*) from public.movimientos_stock) then
    raise exception 'Falló la validación del total de movimientos';
  end if;
  if exists (
    select 1 from public.sipro_productos destino
    join public.productos origen on origen.id = destino.id
    where destino.stock <> origen.stock or destino.precio <> origen.precio
  ) then
    raise exception 'Falló la validación de stock o precio';
  end if;
end;
$$;

commit;
