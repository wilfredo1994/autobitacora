-- =====================================================================
-- 004 · Límites del plan Free / Premium (Sprint 7)
--
--   Free:    1 vehículo activo · 3 recordatorios pendientes · 6 meses de historial visible
--   Premium: 5 vehículos activos · recordatorios ilimitados · historial completo
--
-- Los límites de ESCRITURA se validan aquí, no solo en el frontend (sección 7 del
-- documento maestro). El límite de historial es solo de visualización y lo aplica la app:
-- los registros antiguos se siguen guardando y usando (alertas, consumo).
--
-- Códigos de error propios (la app los traduce a mensajes):
--   PL001 · límite de vehículos activos del plan
--   PL002 · límite de recordatorios pendientes del plan
--   PL003 · vehículo en solo lectura (excede el límite tras volver a Free)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Plan efectivo de un usuario
--    Premium si:
--      · active / past_due: hasta expires_at + 7 días de gracia (cobro fallido o
--        renovación demorada). past_due sin expires_at: 7 días desde el último cambio.
--      · cancelled: hasta expires_at (ya pagó el periodo; sin gracia).
--    En cualquier otro caso (expired, sin suscripción, etc.): Free.
--    Interna: no se expone a los clientes (permitiría consultar el plan de otros).
-- ---------------------------------------------------------------------
create or replace function public.plan_for_user(p_user_id uuid)
returns public.subscription_plan
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select 'premium'::public.subscription_plan
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan = 'premium'
      and (
        (s.status = 'active' and (s.expires_at is null or s.expires_at + interval '7 days' > now()))
        or (s.status = 'past_due' and coalesce(s.expires_at, s.updated_at) + interval '7 days' > now())
        or (s.status = 'cancelled' and s.expires_at > now())
      )
  ), 'free'::public.subscription_plan);
$$;

revoke all on function public.plan_for_user(uuid) from public, anon, authenticated;

-- Límites por plan (null = ilimitado).
create or replace function public.plan_vehicle_limit(p_plan public.subscription_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then 5 else 1 end;
$$;

create or replace function public.plan_reminder_limit(p_plan public.subscription_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then null else 3 end;
$$;

create or replace function public.plan_history_months(p_plan public.subscription_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then null else 6 end;
$$;

-- ---------------------------------------------------------------------
-- 2. RPC para la app: el plan del usuario autenticado, sus límites y su uso actual
--    supabase.rpc('get_my_plan')
-- ---------------------------------------------------------------------
create or replace function public.get_my_plan()
returns table (
  plan             public.subscription_plan,
  subscribed_plan  public.subscription_plan,
  status           public.subscription_status,
  expires_at       timestamptz,
  grace_until      timestamptz,
  vehicle_limit    integer,
  reminder_limit   integer,
  history_months   integer,
  active_vehicles  integer,
  pending_reminders integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select public.plan_for_user((select auth.uid())) as plan
  )
  select
    me.plan,
    coalesce(s.plan, 'free'::public.subscription_plan),
    coalesce(s.status, 'active'::public.subscription_status),
    s.expires_at,
    -- Solo se informa cuando el usuario está usando los días de gracia.
    case
      when me.plan = 'premium' and s.status = 'past_due'
        then coalesce(s.expires_at, s.updated_at) + interval '7 days'
      when me.plan = 'premium' and s.status = 'active' and s.expires_at < now()
        then s.expires_at + interval '7 days'
    end,
    public.plan_vehicle_limit(me.plan),
    public.plan_reminder_limit(me.plan),
    public.plan_history_months(me.plan),
    (select count(*)::integer from public.vehicles v
      where v.user_id = (select auth.uid()) and v.deleted_at is null),
    -- Mismo conteo que enforce_reminder_limit: pendientes de vehículos activos.
    (select count(*)::integer from public.reminders r
      join public.vehicles v on v.id = r.vehicle_id
      where v.user_id = (select auth.uid()) and v.deleted_at is null
        and r.deleted_at is null and r.status = 'pending')
  from me
  left join public.subscriptions s on s.user_id = (select auth.uid());
$$;

revoke all on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;

-- ---------------------------------------------------------------------
-- 3. ¿Se puede escribir en este vehículo?
--    Solo los N vehículos activos más antiguos del dueño (N = límite de su plan).
--    Tras volver a Free con 3 vehículos, el más antiguo sigue editable y los demás
--    quedan en solo lectura. Archivar uno libera el cupo.
-- ---------------------------------------------------------------------
create or replace function public.vehicle_is_writable(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select v.id, v.user_id from public.vehicles v where v.id = p_vehicle_id and v.deleted_at is null
  ),
  ranked as (
    select v.id, row_number() over (order by v.created_at, v.id) as position
    from public.vehicles v
    join target t on t.user_id = v.user_id
    where v.deleted_at is null
  )
  select coalesce((
    select r.position <= public.plan_vehicle_limit(public.plan_for_user(t.user_id))
    from ranked r join target t on t.id = r.id
  ), false);
$$;

revoke all on function public.vehicle_is_writable(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Límite de vehículos activos
--    Al crear un vehículo o al desarchivarlo (deleted_at → null).
-- ---------------------------------------------------------------------
create or replace function public.enforce_vehicle_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  max_vehicles integer;
begin
  if new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.deleted_at is null then
    return new; -- edición normal de un vehículo ya activo (la valida enforce_vehicle_writable)
  end if;

  -- Serializa altas concurrentes del mismo usuario (evita superar el límite con dos clics).
  perform 1 from public.profiles where id = new.user_id for update;

  select count(*) into active_count
  from public.vehicles
  where user_id = new.user_id and deleted_at is null and id <> new.id;

  max_vehicles := public.plan_vehicle_limit(public.plan_for_user(new.user_id));
  if active_count >= max_vehicles then
    raise exception 'Tu plan permite % vehículo(s) activo(s).', max_vehicles
      using errcode = 'PL001';
  end if;
  return new;
end;
$$;

create trigger trg_vehicle_plan_limit
  before insert or update of deleted_at on public.vehicles
  for each row execute function public.enforce_vehicle_limit();

-- Editar un vehículo en solo lectura no está permitido; archivarlo sí (libera el cupo).
create or replace function public.enforce_vehicle_update_writable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    return new; -- archivar
  end if;
  if old.deleted_at is null and not public.vehicle_is_writable(old.id) then
    raise exception 'Este vehículo está en solo lectura con tu plan actual.'
      using errcode = 'PL003';
  end if;
  return new;
end;
$$;

create trigger trg_vehicle_update_writable
  before update on public.vehicles
  for each row execute function public.enforce_vehicle_update_writable();

-- ---------------------------------------------------------------------
-- 5. Registros de un vehículo en solo lectura
--    Mantenimientos, cargas, gastos y recordatorios: no se crean ni modifican.
--    PostgreSQL ejecuta los triggers de un mismo evento en orden alfabético: el prefijo
--    trg_00_ hace que esta validación corra antes que las de kilometraje (002).
-- ---------------------------------------------------------------------
create or replace function public.enforce_vehicle_writable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.vehicle_is_writable(new.vehicle_id) then
    raise exception 'Este vehículo está en solo lectura con tu plan actual.'
      using errcode = 'PL003';
  end if;
  return new;
end;
$$;

create trigger trg_00_maintenance_vehicle_writable
  before insert or update on public.maintenance_records
  for each row execute function public.enforce_vehicle_writable();

create trigger trg_00_fuel_vehicle_writable
  before insert or update on public.fuel_records
  for each row execute function public.enforce_vehicle_writable();

create trigger trg_00_expense_vehicle_writable
  before insert or update on public.expenses
  for each row execute function public.enforce_vehicle_writable();

create trigger trg_00_reminder_vehicle_writable
  before insert or update on public.reminders
  for each row execute function public.enforce_vehicle_writable();

-- ---------------------------------------------------------------------
-- 6. Límite de recordatorios pendientes
--    Cuenta los pendientes activos de todos los vehículos activos del usuario.
--    Se valida al crear uno pendiente y al reabrir/desarchivar uno.
--    Completados, descartados y archivados no cuentan.
-- ---------------------------------------------------------------------
create or replace function public.enforce_reminder_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  pending_count integer;
  max_reminders integer;
begin
  if new.status <> 'pending' or new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and old.deleted_at is null then
    return new; -- ya contaba (por ejemplo, se editó el título)
  end if;

  select user_id into owner_id from public.vehicles where id = new.vehicle_id;
  max_reminders := public.plan_reminder_limit(public.plan_for_user(owner_id));
  if max_reminders is null then
    return new;
  end if;

  perform 1 from public.profiles where id = owner_id for update;

  select count(*) into pending_count
  from public.reminders r
  join public.vehicles v on v.id = r.vehicle_id
  where v.user_id = owner_id
    and v.deleted_at is null
    and r.deleted_at is null
    and r.status = 'pending'
    and r.id <> new.id;

  if pending_count >= max_reminders then
    raise exception 'Tu plan permite % recordatorios pendientes.', max_reminders
      using errcode = 'PL002';
  end if;
  return new;
end;
$$;

create trigger trg_reminder_plan_limit
  before insert or update of status, deleted_at on public.reminders
  for each row execute function public.enforce_reminder_limit();
