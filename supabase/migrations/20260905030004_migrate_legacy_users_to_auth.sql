-- Migra identidades heredadas sin copiar contraseñas en texto plano al modelo nuevo.
-- En entornos que no contienen las tablas legacy, esta migración no hace cambios.
do $$
declare
  legacy_user record;
  new_user_id uuid;
begin
  if to_regclass('public.usuarios') is null
     or to_regclass('public.sipro_usuarios') is null then
    return;
  end if;

  if not exists (select 1 from public.usuarios) then
    return;
  end if;

  if exists (select 1 from auth.users)
     or exists (select 1 from public.sipro_usuarios) then
    raise exception 'Auth y sipro_usuarios deben estar vacíos para evitar mezclar identidades';
  end if;

  if exists (
    select 1 from public.usuarios
    where nombre is null or trim(nombre) = ''
       or email is null or trim(email) = ''
       or password is null or password = ''
       or octet_length(password) > 72
       or lower(rol) not in ('admin', 'encargado', 'inventario', 'consulta')
  ) then
    raise exception 'Hay usuarios heredados con datos incompatibles';
  end if;

  if exists (
    select 1 from public.usuarios
    group by lower(trim(email)) having count(*) > 1
  ) then
    raise exception 'Hay correos heredados duplicados';
  end if;

  for legacy_user in
    select id, trim(nombre) as nombre, lower(trim(email)) as email,
           password, lower(rol) as rol, creado_en
    from public.usuarios
    order by id
  loop
    new_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', new_user_id,
      'authenticated', 'authenticated', legacy_user.email,
      crypt(legacy_user.password, gen_salt('bf', 10)),
      now(), '', '', '', '',
      jsonb_build_object(
        'provider', 'email', 'providers', jsonb_build_array('email'),
        'app', 'sipro', 'role', legacy_user.rol
      ),
      jsonb_build_object('name', legacy_user.nombre, 'email_verified', true),
      legacy_user.creado_en at time zone 'UTC', now(), false, false
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), new_user_id::text, new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text, 'email', legacy_user.email,
        'email_verified', true, 'phone_verified', false
      ),
      'email', now(), now(), now()
    );
  end loop;

  update public.sipro_usuarios profile
     set creado_en = legacy.creado_en at time zone 'UTC',
         actualizado_en = now()
    from public.usuarios legacy
   where profile.email = lower(trim(legacy.email));

  if (select count(*) from auth.users) <> (select count(*) from public.usuarios)
     or (select count(*) from public.sipro_usuarios) <> (select count(*) from public.usuarios)
     or (select count(*) from auth.identities where provider = 'email') <> (select count(*) from public.usuarios) then
    raise exception 'Falló la validación de identidades migradas';
  end if;
end;
$$;
