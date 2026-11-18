-- ============================================================
-- Crear el usuario administrador de Eco Carnes en Supabase
-- Ejecutar en SQL Editor → New query → Run
-- ============================================================
--
-- Credenciales iniciales:
--   Correo:     admin@ecocarnes.com
--   Contraseña: EcoCarnes!2026
--
-- Cambia la contraseña después del primer ingreso desde
-- Authentication → Users → el usuario → Reset password.
-- No compartas este archivo con la contraseña incluida.

create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@ecocarnes.com',
  crypt('EcoCarnes!2026', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (email) do nothing;

-- Las versiones recientes de Supabase necesitan la identidad para el login.
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true
  ),
  'email',
  u.email,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'admin@ecocarnes.com'
  and not exists (
    select 1
    from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- Verificación: debe devolver 1 fila con el correo del administrador.
select email, email_confirmed_at is not null as confirmado
from auth.users
where email = 'admin@ecocarnes.com';
