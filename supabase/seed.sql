-- Dataset ficticio, realista y seguro para demostración de SIPRO.
insert into public.sipro_categorias (nombre) values
  ('Alimentos secos'), ('Bebidas'), ('Limpieza'), ('Habitaciones'),
  ('Mantenimiento'), ('Papelería'), ('Cocina'), ('Recepción');

insert into public.sipro_productos
  (codigodebarra, nombre, precio, stock, stock_minimo, categoria_id)
values
  ('7441000000011','Arroz premium 1 kg',1850,42,12,(select id from public.sipro_categorias where nombre='Alimentos secos')),
  ('7441000000028','Frijol rojo 900 g',2100,31,10,(select id from public.sipro_categorias where nombre='Alimentos secos')),
  ('7441000000035','Café molido 500 g',4950,18,8,(select id from public.sipro_categorias where nombre='Bebidas')),
  ('7441000000042','Agua mineral 600 ml',950,96,24,(select id from public.sipro_categorias where nombre='Bebidas')),
  ('7441000000059','Jugo de naranja 1 L',2250,22,8,(select id from public.sipro_categorias where nombre='Bebidas')),
  ('7441000000066','Detergente líquido 3 L',6800,14,6,(select id from public.sipro_categorias where nombre='Limpieza')),
  ('7441000000073','Desinfectante concentrado 1 L',3900,9,10,(select id from public.sipro_categorias where nombre='Limpieza')),
  ('7441000000080','Bolsa basura industrial x10',3200,27,10,(select id from public.sipro_categorias where nombre='Limpieza')),
  ('7441000000097','Papel higiénico hotelero x12',7600,38,15,(select id from public.sipro_categorias where nombre='Habitaciones')),
  ('7441000000103','Jabón de tocador 30 g x50',12500,16,8,(select id from public.sipro_categorias where nombre='Habitaciones')),
  ('7441000000110','Champú amenidad 30 ml x50',14900,12,8,(select id from public.sipro_categorias where nombre='Habitaciones')),
  ('7441000000127','Bombillo LED 12 W',2400,21,10,(select id from public.sipro_categorias where nombre='Mantenimiento')),
  ('7441000000134','Cinta aislante profesional',1350,7,8,(select id from public.sipro_categorias where nombre='Mantenimiento')),
  ('7441000000141','Batería alcalina AA x4',3150,19,8,(select id from public.sipro_categorias where nombre='Mantenimiento')),
  ('7441000000158','Resma papel carta 500 hojas',3950,11,5,(select id from public.sipro_categorias where nombre='Papelería')),
  ('7441000000165','Bolígrafo azul caja x12',2800,8,6,(select id from public.sipro_categorias where nombre='Papelería')),
  ('7441000000172','Rollo térmico 80 mm x10',9900,13,6,(select id from public.sipro_categorias where nombre='Recepción')),
  ('7441000000189','Aceite vegetal 3 L',7200,17,8,(select id from public.sipro_categorias where nombre='Cocina')),
  ('7441000000196','Harina de trigo 1 kg',1450,26,10,(select id from public.sipro_categorias where nombre='Cocina')),
  ('7441000000202','Guantes nitrilo caja x100',8900,6,8,(select id from public.sipro_categorias where nombre='Cocina'));

insert into public.sipro_movimientos_stock
  (producto_id, producto_nombre, tipo_movimiento, cantidad, nota, fecha)
select id, nombre, 'ajuste', stock, 'Inventario inicial de demostración',
       now() - ((id % 14) || ' days')::interval
from public.sipro_productos;
