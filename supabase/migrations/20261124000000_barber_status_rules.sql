-- Barber appointment status rules, aligned with the app (src/admin/data/store.tsx → barberStatusCheck).
--
-- Fixes: a barber who started a client early ("arrived" → "in the chair" before the booked time)
-- must be able to press Done. Completing an appointment that is IN THE CHAIR is always allowed;
-- completing without having started, or marking a no-show, waits for the booked start time;
-- cancelling is only possible before it starts; arrival / start are recorded on the day itself.
-- Barbers still change only the status of appointments assigned to them (RLS appts_barber_update);
-- every other field stays owner-only. The owner may correct anything.

create or replace function public.guard_appointment_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  started boolean := old.starts_at <= now();
  same_day boolean := (old.starts_at at time zone 'Europe/Amsterdam')::date = (now() at time zone 'Europe/Amsterdam')::date;
begin
  if public.is_owner() then return new; end if;

  -- defence in depth: RLS already limits barbers to their own rows
  if old.barber_id is distinct from public.my_barber_id() then
    raise exception 'not_yours: barbers may only change their own appointments' using errcode = '42501';
  end if;
  if (new.client_id, new.barber_id, new.service_id, new.starts_at, new.ends_at, new.price, new.source, new.paid_with)
     is distinct from (old.client_id, old.barber_id, old.service_id, old.starts_at, old.ends_at, old.price, old.source, old.paid_with) then
    raise exception 'barbers may only change the status or note of their appointments' using errcode = '42501';
  end if;
  if new.status is not distinct from old.status then return new; end if;

  -- the workflow
  if not (
       (old.status = 'booked'    and new.status in ('confirmed', 'arrived', 'cancelled', 'no_show')) or
       (old.status = 'confirmed' and new.status in ('arrived', 'in_chair', 'completed', 'cancelled', 'no_show')) or
       (old.status = 'arrived'   and new.status in ('in_chair', 'completed', 'no_show')) or
       (old.status = 'in_chair'  and new.status = 'completed') or
       (old.status = 'no_show'   and new.status = 'arrived')) then
    raise exception 'not_in_workflow: status change % → % is not allowed', old.status, new.status using errcode = '42501';
  end if;

  -- the booking rules
  if new.status = 'cancelled' and started then
    raise exception 'cancel_after_start: an appointment can only be cancelled before it starts' using errcode = '42501';
  end if;
  if new.status = 'completed' and old.status <> 'in_chair' and not started then
    raise exception 'not_started: completing requires the appointment to have started' using errcode = '42501';
  end if;
  if new.status = 'no_show' and not started then
    raise exception 'not_started: a no-show can only be recorded after the booked start time' using errcode = '42501';
  end if;
  if new.status in ('arrived', 'in_chair') and not same_day and not started then
    raise exception 'not_today: arrival and start are recorded on the day of the appointment' using errcode = '42501';
  end if;
  return new;
end $$;
