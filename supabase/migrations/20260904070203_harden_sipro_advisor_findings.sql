-- Corrige los hallazgos del asesor que pertenecen a SIPRO. No modifica objetos
-- de la aplicación que ya compartía este proyecto.

revoke all on function public.sipro_handle_new_auth_user() from public, anon, authenticated;

create index if not exists sipro_movimientos_usuario_idx
  on public.sipro_movimientos_stock(usuario_id);

drop policy if exists sipro_usuarios_select on public.sipro_usuarios;
create policy sipro_usuarios_select on public.sipro_usuarios
for select to authenticated using (
  (select public.sipro_role()) = 'admin'
  or (auth_user_id = (select auth.uid()) and activo)
);

drop policy if exists sipro_categorias_select on public.sipro_categorias;
create policy sipro_categorias_select on public.sipro_categorias
for select to authenticated using (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario', 'consulta')
);

drop policy if exists sipro_productos_select on public.sipro_productos;
create policy sipro_productos_select on public.sipro_productos
for select to authenticated using (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario', 'consulta')
);

drop policy if exists sipro_productos_insert on public.sipro_productos;
create policy sipro_productos_insert on public.sipro_productos
for insert to authenticated with check (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario')
);

drop policy if exists sipro_productos_update on public.sipro_productos;
create policy sipro_productos_update on public.sipro_productos
for update to authenticated using (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario')
) with check (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario')
);

drop policy if exists sipro_productos_delete on public.sipro_productos;
create policy sipro_productos_delete on public.sipro_productos
for delete to authenticated using ((select public.sipro_role()) = 'admin');

drop policy if exists sipro_movimientos_select on public.sipro_movimientos_stock;
create policy sipro_movimientos_select on public.sipro_movimientos_stock
for select to authenticated using (
  (select public.sipro_role()) in ('admin', 'encargado', 'inventario', 'consulta')
);
