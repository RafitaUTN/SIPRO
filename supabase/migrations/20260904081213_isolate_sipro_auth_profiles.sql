-- La aplicación preexistente limita sus perfiles a cinco mediante un trigger
-- global sobre auth.users. SIPRO comparte Auth, pero mantiene perfiles propios.
-- Estas funciones conservan el límite anterior para usuarios ajenos a SIPRO y
-- evitan que las cuentas SIPRO ocupen o contaminen public.users_profile.

create or replace function public.enforce_max_five_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'app' = 'sipro' then
    return new;
  end if;

  if to_regclass('public.users_profile') is null then
    return new;
  end if;

  if (
    select count(*)
    from public.users_profile profile
    join auth.users account on account.id = profile.id
    where coalesce(account.raw_app_meta_data ->> 'app', '') <> 'sipro'
  ) >= 5 then
    raise exception 'Maximum of 5 users reached for this project';
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'app' = 'sipro' then
    return new;
  end if;

  if to_regclass('public.users_profile') is null then
    return new;
  end if;

  insert into public.users_profile (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

  return new;
end;
$$;

revoke all on function public.enforce_max_five_users() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.users_profile') is not null then
    execute $cleanup$
      delete from public.users_profile profile
      using auth.users account
      where profile.id = account.id
        and account.raw_app_meta_data ->> 'app' = 'sipro'
    $cleanup$;
  end if;
end;
$$;
