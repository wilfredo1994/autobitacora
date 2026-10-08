-- =====================================================================
-- AutoBitácora · Migración 001 · Esquema inicial + RLS
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Es seguro ejecutarlo una sola vez sobre un proyecto nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type public.vehicle_type        as enum ('car', 'motorcycle', 'pickup', 'van', 'truck', 'other');
create type public.fuel_type           as enum ('gasoline', 'diesel', 'glp', 'gnv', 'electric', 'other');
create type public.reminder_status     as enum ('pending', 'completed', 'dismissed');
create type public.subscription_plan   as enum ('free', 'premium');
create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');

-- ---------------------------------------------------------------------
-- 2. FUNCIÓN GENÉRICA updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. TABLAS
-- ---------------------------------------------------------------------

-- 3.1 profiles ---------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 vehicles ---------------------------------------------------------
-- user_id usa auth.uid() por defecto: el frontend no necesita enviarlo,
-- y RLS (WITH CHECK) garantiza que siempre sea el del usuario autenticado.
create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand           text not null,
  model           text not null,
  year            integer not null,
  license_plate   text not null,
  vehicle_type    public.vehicle_type not null default 'car',
  current_mileage bigint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint vehicles_brand_not_blank   check (length(trim(brand)) > 0),
  constraint vehicles_model_not_blank   check (length(trim(model)) > 0),
  constraint vehicles_plate_not_blank   check (length(trim(license_plate)) > 0),
  constraint vehicles_year_valid        check (year between 1900 and 2100),
  constraint vehicles_mileage_not_neg   check (current_mileage >= 0)
);

-- Unicidad de placa por usuario entre vehículos activos (no archivados)
create unique index vehicles_user_plate_active_uidx
  on public.vehicles (user_id, upper(trim(license_plate)))
  where deleted_at is null;

create index vehicles_user_active_idx
  on public.vehicles (user_id, created_at desc)
  where deleted_at is null;

-- 3.3 maintenance_records ----------------------------------------------
create table public.maintenance_records (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  service_type text not null,
  description  text,
  service_date date not null,
  mileage      bigint not null,
  cost         numeric(12,2) not null default 0,
  workshop     text,
  next_mileage bigint,
  next_date    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint maintenance_service_type_not_blank check (length(trim(service_type)) > 0),
  constraint maintenance_mileage_not_neg        check (mileage >= 0),
  constraint maintenance_cost_not_neg           check (cost >= 0),
  constraint maintenance_next_mileage_valid     check (next_mileage is null or next_mileage >= mileage),
  constraint maintenance_next_date_valid        check (next_date is null or next_date >= service_date)
);
create index maintenance_vehicle_date_idx
  on public.maintenance_records (vehicle_id, service_date desc)
  where deleted_at is null;

-- 3.4 fuel_records -----------------------------------------------------
create table public.fuel_records (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id) on delete cascade,
  fuel_date       date not null,
  mileage         bigint not null,
  fuel_type       public.fuel_type not null default 'gasoline',
  liters          numeric(10,3) not null,
  price_per_liter numeric(10,3) not null,
  total_amount    numeric(12,2) not null,
  station         text,
  full_tank       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint fuel_mileage_not_neg check (mileage >= 0),
  constraint fuel_liters_positive check (liters > 0),
  constraint fuel_price_not_neg   check (price_per_liter >= 0),
  constraint fuel_total_not_neg   check (total_amount >= 0)
);
create index fuel_vehicle_date_idx
  on public.fuel_records (vehicle_id, fuel_date desc)
  where deleted_at is null;

-- 3.5 expenses ---------------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  expense_date date not null,
  category     text not null,
  description  text,
  amount       numeric(12,2) not null,
  mileage      bigint,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint expenses_category_not_blank check (length(trim(category)) > 0),
  constraint expenses_amount_not_neg     check (amount >= 0),
  constraint expenses_mileage_not_neg    check (mileage is null or mileage >= 0)
);
create index expenses_vehicle_date_idx
  on public.expenses (vehicle_id, expense_date desc)
  where deleted_at is null;

-- 3.6 reminders --------------------------------------------------------
create table public.reminders (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  title        text not null,
  description  text,
  due_date     date,
  due_mileage  bigint,
  status       public.reminder_status not null default 'pending',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint reminders_title_not_blank   check (length(trim(title)) > 0),
  constraint reminders_has_due           check (due_date is not null or due_mileage is not null),
  constraint reminders_due_mileage_valid check (due_mileage is null or due_mileage >= 0)
);
create index reminders_vehicle_status_idx
  on public.reminders (vehicle_id, status, due_date)
  where deleted_at is null;

-- 3.7 subscriptions ----------------------------------------------------
create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  plan       public.subscription_plan   not null default 'free',
  status     public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. TRIGGERS updated_at
-- ---------------------------------------------------------------------
create trigger trg_profiles_updated_at            before update on public.profiles            for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated_at            before update on public.vehicles            for each row execute function public.set_updated_at();
create trigger trg_maintenance_records_updated_at before update on public.maintenance_records for each row execute function public.set_updated_at();
create trigger trg_fuel_records_updated_at        before update on public.fuel_records        for each row execute function public.set_updated_at();
create trigger trg_expenses_updated_at            before update on public.expenses            for each row execute function public.set_updated_at();
create trigger trg_reminders_updated_at           before update on public.reminders           for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated_at       before update on public.subscriptions       for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. TRIGGER: crear perfil + suscripción Free al registrarse un usuario
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. FUNCIÓN AUXILIAR PARA POLICIES DE TABLAS HIJAS
--    ¿El vehículo pertenece al usuario autenticado?
-- ---------------------------------------------------------------------
create or replace function public.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_vehicle(uuid) from public, anon;
grant execute on function public.owns_vehicle(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.vehicles            enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.fuel_records        enable row level security;
alter table public.expenses            enable row level security;
alter table public.reminders           enable row level security;
alter table public.subscriptions       enable row level security;

-- 7.1 profiles: ver y editar solo el propio (el INSERT lo hace el trigger)
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 7.2 vehicles: CRUD sobre los propios. No hay policy DELETE a propósito:
--     "archivar" es un UPDATE de deleted_at (borrado lógico).
create policy vehicles_select_own on public.vehicles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy vehicles_insert_own on public.vehicles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy vehicles_update_own on public.vehicles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 7.3 tablas hijas: acceso solo si el vehicle_id es del usuario.
--     (Sin DELETE: se archiva con deleted_at.)
create policy maintenance_select_own on public.maintenance_records
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy maintenance_insert_own on public.maintenance_records
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy maintenance_update_own on public.maintenance_records
  for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

create policy fuel_select_own on public.fuel_records
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy fuel_insert_own on public.fuel_records
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy fuel_update_own on public.fuel_records
  for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

create policy expenses_select_own on public.expenses
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy expenses_insert_own on public.expenses
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy expenses_update_own on public.expenses
  for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

create policy reminders_select_own on public.reminders
  for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy reminders_insert_own on public.reminders
  for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy reminders_update_own on public.reminders
  for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));

-- 7.4 subscriptions: el usuario SOLO puede leer la suya.
--     Sin policies de INSERT/UPDATE/DELETE: el plan solo lo cambia el backend
--     (service_role / webhook de pagos), nunca el frontend.
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 8. PRIVILEGIOS (defensa en profundidad además de RLS)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select, update                 on public.profiles            to authenticated;
grant select, insert, update         on public.vehicles            to authenticated;
grant select, insert, update         on public.maintenance_records to authenticated;
grant select, insert, update         on public.fuel_records        to authenticated;
grant select, insert, update         on public.expenses            to authenticated;
grant select, insert, update         on public.reminders           to authenticated;
grant select                         on public.subscriptions       to authenticated;

-- Evita que tablas futuras queden expuestas por defecto a anon
alter default privileges in schema public revoke all on tables from anon;
