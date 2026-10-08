-- Reglas de negocio que deben aplicarse también a escrituras directas por API.

create or replace function public.validate_vehicle_mileage_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  event_vehicle_id uuid;
  event_date date;
  event_mileage bigint;
  previous_mileage bigint;
  next_mileage bigint;
begin
  if tg_op = 'UPDATE' and new.vehicle_id is distinct from old.vehicle_id then
    raise exception 'No se puede mover un registro de kilometraje a otro vehículo.'
      using errcode = 'P0001';
  end if;

  if new.deleted_at is not null then
    return new;
  end if;

  event_vehicle_id := new.vehicle_id;
  if tg_table_name = 'maintenance_records' then
    event_date := new.service_date;
    event_mileage := new.mileage;
  else
    event_date := new.fuel_date;
    event_mileage := new.mileage;
  end if;

  -- Serializa registros de odómetro del mismo vehículo para evitar carreras.
  perform 1
  from public.vehicles
  where id = event_vehicle_id
  for update;

  if not found then
    raise exception 'No se encontró el vehículo del registro.' using errcode = 'P0001';
  end if;

  select max(event.mileage)
  into previous_mileage
  from (
    select m.mileage
    from public.maintenance_records m
    where m.vehicle_id = event_vehicle_id
      and m.deleted_at is null
      and m.service_date < event_date
      and m.id <> new.id
    union all
    select f.mileage
    from public.fuel_records f
    where f.vehicle_id = event_vehicle_id
      and f.deleted_at is null
      and f.fuel_date < event_date
      and f.id <> new.id
  ) event;

  select min(event.mileage)
  into next_mileage
  from (
    select m.mileage
    from public.maintenance_records m
    where m.vehicle_id = event_vehicle_id
      and m.deleted_at is null
      and m.service_date > event_date
      and m.id <> new.id
    union all
    select f.mileage
    from public.fuel_records f
    where f.vehicle_id = event_vehicle_id
      and f.deleted_at is null
      and f.fuel_date > event_date
      and f.id <> new.id
  ) event;

  if previous_mileage is not null and event_mileage < previous_mileage then
    raise exception 'El kilometraje es menor que el de un registro anterior.'
      using errcode = 'P0001';
  end if;
  if next_mileage is not null and event_mileage > next_mileage then
    raise exception 'El kilometraje es mayor que el de un registro posterior.'
      using errcode = 'P0001';
  end if;

  -- La actualización del odómetro ocurre dentro de la misma transacción.
  update public.vehicles
  set current_mileage = event_mileage
  where id = event_vehicle_id
    and current_mileage < event_mileage;

  return new;
end;
$$;

create trigger trg_maintenance_mileage_order
  before insert or update on public.maintenance_records
  for each row execute function public.validate_vehicle_mileage_event();

create trigger trg_fuel_mileage_order
  before insert or update on public.fuel_records
  for each row execute function public.validate_vehicle_mileage_event();

create or replace function public.prevent_vehicle_mileage_below_history()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  highest_recorded_mileage bigint;
begin
  if new.current_mileage < old.current_mileage then
    select max(event.mileage)
    into highest_recorded_mileage
    from (
      select m.mileage
      from public.maintenance_records m
      where m.vehicle_id = new.id and m.deleted_at is null
      union all
      select f.mileage
      from public.fuel_records f
      where f.vehicle_id = new.id and f.deleted_at is null
    ) event;

    if highest_recorded_mileage is not null and new.current_mileage < highest_recorded_mileage then
      raise exception 'El kilometraje actual no puede ser menor que el de un registro guardado.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_vehicle_mileage_not_below_history
  before update of current_mileage on public.vehicles
  for each row execute function public.prevent_vehicle_mileage_below_history();

create or replace function public.prevent_future_log_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  record_date date;
begin
  if tg_table_name = 'maintenance_records' then
    record_date := new.service_date;
  elsif tg_table_name = 'fuel_records' then
    record_date := new.fuel_date;
  else
    record_date := new.expense_date;
  end if;

  if record_date > current_date then
    raise exception 'La fecha del registro no puede estar en el futuro.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_maintenance_date_not_future
  before insert or update of service_date on public.maintenance_records
  for each row execute function public.prevent_future_log_dates();

create trigger trg_fuel_date_not_future
  before insert or update of fuel_date on public.fuel_records
  for each row execute function public.prevent_future_log_dates();

create trigger trg_expense_date_not_future
  before insert or update of expense_date on public.expenses
  for each row execute function public.prevent_future_log_dates();

create or replace function public.calculate_fuel_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.total_amount := round(new.liters * new.price_per_liter, 2);
  return new;
end;
$$;

create trigger trg_calculate_fuel_total
  before insert or update of liters, price_per_liter on public.fuel_records
  for each row execute function public.calculate_fuel_total();

create or replace function public.sync_reminder_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_sync_reminder_completion
  before insert or update of status, completed_at on public.reminders
  for each row execute function public.sync_reminder_completion();