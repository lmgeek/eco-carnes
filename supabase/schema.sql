-- ============================================================
-- Esquema inicial del menú digital de carnes
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- Es seguro volver a ejecutarlo: usa IF NOT EXISTS y DROP POLICY IF EXISTS.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric not null check (precio >= 0),
  unidad text not null default 'kg',
  imagen_url text,
  categoria text,
  activo boolean not null default true,
  orden integer default 0,
  creado_en timestamptz default now()
);

create table if not exists configuracion (
  id integer primary key default 1 check (id = 1),
  whatsapp text not null,
  nombre_negocio text not null,
  moneda text not null default '$',
  mensaje_inicial text default 'Hola, quiero hacer un pedido:'
);

create index if not exists productos_activo_orden_idx on productos (activo, orden);

-- Fila única de configuración. Cambia el número por el real del negocio.
insert into configuracion (id, whatsapp, nombre_negocio, moneda, mensaje_inicial)
values (1, '5491122934235', 'Eco Carnes', '$', 'Hola, quiero hacer un pedido:')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Seguridad: Row Level Security
-- ------------------------------------------------------------

alter table productos enable row level security;
alter table configuracion enable row level security;

-- Lectura pública: solo productos activos y la configuración.
drop policy if exists "lectura publica productos" on productos;
create policy "lectura publica productos"
  on productos for select
  using (activo = true);

drop policy if exists "lectura publica configuracion" on configuracion;
create policy "lectura publica configuracion"
  on configuracion for select
  using (true);

-- Administrador autenticado: control total (incluye productos ocultos).
drop policy if exists "admin gestiona productos" on productos;
create policy "admin gestiona productos"
  on productos for all to authenticated
  using (true) with check (true);

drop policy if exists "admin gestiona configuracion" on configuracion;
create policy "admin gestiona configuracion"
  on configuracion for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- Recordatorio
-- ------------------------------------------------------------
-- 1. Crea el usuario administrador en Authentication → Users → Add user.
-- 2. Desactiva el registro público en Authentication → Providers → Email.
-- 3. Usa solo la clave anon/public en el frontend; nunca la service_role.
-- 4. El número de pedidos ya queda cargado como +54 9 11 2293-4235
--    (guardado como 5491122934235, sin + ni espacios).
--    Si el proyecto ya existía con otro número, ejecuta supabase/actualizar-whatsapp.sql.
