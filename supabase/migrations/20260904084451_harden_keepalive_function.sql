-- El keep-alive no necesita privilegios elevados: solo devuelve una constante.
create or replace function public.keepalive()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select 1;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated, service_role;
