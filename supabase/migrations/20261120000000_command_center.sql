-- NOIR Command Center — schema, row-level security and audit log.
-- Target: Supabase Postgres (EU / Frankfurt). NOT YET APPLIED to any project.
-- Tested locally against PostgreSQL 16 with a Supabase auth shim: supabase/tests/.
--
-- Principles
--   * Every table has row-level security. The browser only ever uses the anon key
--     plus the signed-in user's session, so these policies decide what anyone sees.
--   * The role comes from public.staff (owner-managed), never from the client.
--   * Barbers: own appointments (status changes only, allowed transitions),
--     own schedule (read), own profile (limited fields), clients booked with them
--     (limited columns, via barber_clients view). No finance, gift cards, settings.
--   * Gift cards activate and redeem only through owner-only functions.
--   * Every administrative change is written to an insert-only audit log.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ————————————————————————————————————————— types
create type public.staff_role as enum ('owner', 'barber');
create type public.appointment_status as enum ('booked', 'confirmed', 'arrived', 'in_chair', 'completed', 'no_show', 'cancelled');
create type public.gift_payment as enum ('pending', 'paid', 'cancelled');
create type public.gift_delivery as enum ('awaiting_payment', 'manual_required', 'delivered');
create type public.membership_status as enum ('active', 'paused', 'past_due', 'cancelled');

-- ————————————————————————————————————————— tables
create table public.barbers (
  id text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  name text not null check (length(name) between 2 and 80),
  years int not null default 0 check (years between 0 and 80),
  image text not null default '',
  instagram text not null default '',
  bio text not null default '' check (length(bio) <= 400),
  specialty text not null default '' check (length(specialty) <= 80),
  phone text not null default '',
  email text not null default '',
  commission numeric(4, 3) not null default 0 check (commission between 0 and 1),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  barber_id text unique references public.barbers (id),
  active boolean not null default true,
  language text not null default 'en' check (language in ('en', 'de', 'sq')),
  invited_at timestamptz not null default now(),
  check (role = 'owner' or barber_id is not null)
);

create table public.working_hours (
  barber_id text not null references public.barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  primary key (barber_id, weekday),
  check (end_time > start_time)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references public.barbers (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null default '' check (length(reason) <= 120),
  check (ends_on >= starts_on)
);

create table public.services (
  id text primary key,
  category text not null check (category in ('haircuts', 'beard', 'rituals')),
  duration_min int not null check (duration_min between 10 and 240),
  price numeric(7, 2) not null check (price > 0 and price < 1000),
  active boolean not null default true,
  sort int not null default 0
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  phone text not null default '',
  email text not null default '',
  notes text not null default '' check (length(notes) <= 1000),
  marketing boolean not null default false,
  preferred_barber text references public.barbers (id),
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  barber_id text not null references public.barbers (id),
  service_id text not null references public.services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price numeric(7, 2) not null check (price >= 0),
  status public.appointment_status not null default 'booked',
  source text not null default 'online' check (source in ('online', 'phone', 'walk_in')),
  note text not null default '' check (length(note) <= 400),
  paid_with text check (paid_with in ('card', 'cash', 'gift_card', 'membership')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- a barber can never be double-booked, even by two simultaneous requests
  constraint no_double_booking exclude using gist (barber_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status not in ('cancelled', 'no_show'))
);
create index appointments_barber_time on public.appointments (barber_id, starts_at);
create index appointments_client on public.appointments (client_id);

create table public.gift_cards (
  code text primary key check (code ~ '^NOIR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  reference text not null unique check (reference ~ '^GC-[A-HJ-NP-Z2-9]{6}$'),
  amount numeric(7, 2) not null check (amount between 25 and 1000),
  balance numeric(7, 2) not null default 0 check (balance >= 0 and balance <= amount),
  recipient text not null,
  sender text not null,
  send_to text not null,
  delivery_method text not null check (delivery_method in ('email', 'whatsapp', 'sms')),
  payment_method text not null check (payment_method in ('cod', 'in_person')),
  payment public.gift_payment not null default 'pending',
  delivery public.gift_delivery not null default 'awaiting_payment',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  -- an unpaid card never carries a balance
  check (payment = 'paid' or balance = 0),
  check ((payment = 'paid') = (activated_at is not null))
);

create table public.gift_card_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.gift_cards (code),
  amount numeric(7, 2) not null check (amount > 0),
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid not null default auth.uid()
);

create table public.membership_plans (
  id text primary key,
  name text not null,
  monthly numeric(7, 2) not null check (monthly > 0),
  active boolean not null default true
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  plan_id text not null references public.membership_plans (id),
  status public.membership_status not null default 'active',
  billing text not null default 'monthly' check (billing in ('monthly', 'annual')),
  since date not null default current_date,
  renews date not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('appointment', 'gift_card', 'membership')),
  ref text not null,
  amount numeric(8, 2) not null check (amount > 0),
  method text not null check (method in ('card', 'cash', 'cod')),
  received_at timestamptz not null default now(),
  recorded_by uuid not null default auth.uid()
);

create table public.business_settings (
  id boolean primary key default true check (id),
  booking_window_days int not null default 21 check (booking_window_days between 1 and 180),
  cancellation_hours int not null default 24 check (cancellation_hours between 0 and 168),
  no_show_fee_percent int not null default 50 check (no_show_fee_percent between 0 and 100),
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 60),
  allow_walk_ins boolean not null default true,
  cash_on_delivery boolean not null default true,
  cod_area text not null default '',
  reminder_hours int not null default 24 check (reminder_hours between 1 and 168)
);

create table public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_role public.staff_role,
  action text not null,
  table_name text not null,
  record_id text,
  before jsonb,
  after jsonb
);

-- ————————————————————————————————————————— identity helpers
-- SECURITY DEFINER so policies can read staff without recursion; search_path pinned.
create function public.current_staff_role() returns public.staff_role
  language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s where s.user_id = auth.uid() and s.active
$$;

create function public.is_owner() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_staff_role() = 'owner', false)
$$;

create function public.is_staff() returns boolean
  language sql stable security definer set search_path = '' as $$
  select public.current_staff_role() is not null
$$;

create function public.my_barber_id() returns text
  language sql stable security definer set search_path = '' as $$
  select s.barber_id from public.staff s where s.user_id = auth.uid() and s.active
$$;

-- ————————————————————————————————————————— row-level security
alter table public.barbers enable row level security;
alter table public.staff enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.gift_cards enable row level security;
alter table public.gift_card_redemptions enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_log enable row level security;

-- barbers: website sees public columns of active barbers; owner all; barber own row
create policy barbers_public_read on public.barbers for select to anon using (active);
create policy barbers_staff_read on public.barbers for select to authenticated using (public.is_owner() or id = public.my_barber_id());
create policy barbers_owner_write on public.barbers for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy barbers_self_update on public.barbers for update to authenticated using (id = public.my_barber_id()) with check (id = public.my_barber_id());
revoke select on public.barbers from anon;
grant select (id, name, years, image, instagram, bio, specialty, active, sort) on public.barbers to anon;

-- staff: owner manages; each person sees only their own row
create policy staff_read on public.staff for select to authenticated using (public.is_owner() or user_id = auth.uid());
create policy staff_owner_write on public.staff for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- schedules: owner manages; barber reads own; website reads hours (not time-off reasons)
create policy hours_public_read on public.working_hours for select to anon using (true);
create policy hours_read on public.working_hours for select to authenticated using (public.is_owner() or barber_id = public.my_barber_id());
create policy hours_owner_write on public.working_hours for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy timeoff_read on public.time_off for select to authenticated using (public.is_owner() or barber_id = public.my_barber_id());
create policy timeoff_owner_write on public.time_off for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- services & plans: everyone reads active ones; owner manages
create policy services_read on public.services for select to anon, authenticated using (active or public.is_owner());
create policy services_owner_write on public.services for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy plans_read on public.membership_plans for select to anon, authenticated using (active or public.is_owner());
create policy plans_owner_write on public.membership_plans for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- clients: owner only on the table; barbers use the limited barber_clients view
create policy clients_owner on public.clients for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- appointments: owner all; barber own (updates further restricted by trigger)
create policy appts_read on public.appointments for select to authenticated using (public.is_owner() or barber_id = public.my_barber_id());
create policy appts_owner_write on public.appointments for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy appts_barber_update on public.appointments for update to authenticated using (barber_id = public.my_barber_id()) with check (barber_id = public.my_barber_id());

-- owner-only business data
create policy gift_owner_read on public.gift_cards for select to authenticated using (public.is_owner());
create policy gift_owner_insert on public.gift_cards for insert to authenticated with check (public.is_owner() and payment = 'pending');
create policy gift_owner_update on public.gift_cards for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy redemptions_owner_read on public.gift_card_redemptions for select to authenticated using (public.is_owner());
create policy memberships_owner on public.memberships for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy payments_owner on public.payments for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy settings_owner on public.business_settings for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy audit_owner_read on public.audit_log for select to authenticated using (public.is_owner());
-- no insert/update/delete policies on audit_log or redemptions: only definer functions write them
revoke insert, update, delete on public.audit_log from anon, authenticated;
revoke insert, update, delete on public.gift_card_redemptions from anon, authenticated;

-- ————————————————————————————————————————— limited client view for barbers
-- Runs as its owner (bypasses table RLS) and filters itself: a barber gets only
-- clients who have an appointment with them, without email or marketing consent.
create view public.barber_clients with (security_barrier) as
  select c.id, c.name, c.phone, c.notes, c.preferred_barber
  from public.clients c
  where public.my_barber_id() is not null
    and exists (select 1 from public.appointments a where a.client_id = c.id and a.barber_id = public.my_barber_id());
revoke all on public.barber_clients from anon;
grant select on public.barber_clients to authenticated;

-- ————————————————————————————————————————— guard triggers
-- Barbers may change only the status (along allowed transitions) and note of their own appointments.
create function public.guard_appointment_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if public.is_owner() then return new; end if;
  if (new.client_id, new.barber_id, new.service_id, new.starts_at, new.ends_at, new.price, new.source, new.paid_with)
     is distinct from (old.client_id, old.barber_id, old.service_id, old.starts_at, old.ends_at, old.price, old.source, old.paid_with) then
    raise exception 'barbers may only change the status or note of their appointments' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'booked' and new.status in ('confirmed', 'arrived', 'no_show')) or
       (old.status = 'confirmed' and new.status in ('arrived', 'no_show')) or
       (old.status = 'arrived' and new.status in ('in_chair', 'no_show')) or
       (old.status = 'in_chair' and new.status = 'completed') or
       (old.status = 'no_show' and new.status = 'arrived')) then
    raise exception 'status change % → % is not allowed', old.status, new.status using errcode = '42501';
  end if;
  return new;
end $$;
create trigger appointments_guard before update on public.appointments for each row execute function public.guard_appointment_update();

-- Barbers may edit only bio, specialty, instagram and phone on their own row.
create function public.guard_barber_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if public.is_owner() then return new; end if;
  if (new.id, new.name, new.years, new.image, new.email, new.commission, new.active, new.sort)
     is distinct from (old.id, old.name, old.years, old.image, old.email, old.commission, old.active, old.sort) then
    raise exception 'barbers may only edit bio, specialty, instagram and phone' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger barbers_guard before update on public.barbers for each row execute function public.guard_barber_update();

-- The shop must always keep at least one active owner.
create function public.guard_last_owner() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.active and (tg_op = 'DELETE' or new.role <> 'owner' or not new.active) then
    if (select count(*) from public.staff where role = 'owner' and active and user_id <> old.user_id) = 0 then
      raise exception 'the last active owner cannot be removed or demoted' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger staff_last_owner before update or delete on public.staff for each row execute function public.guard_last_owner();

-- Gift card payment state and balance can only change inside the functions below.
create function public.guard_gift_card() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('noir.gift_op', true), '') <> 'on' and
     (new.payment, new.balance, new.activated_at, new.amount, new.code) is distinct from (old.payment, old.balance, old.activated_at, old.amount, old.code) then
    raise exception 'use confirm_gift_payment / cancel_gift_order / redeem_gift_card' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger gift_cards_guard before update on public.gift_cards for each row execute function public.guard_gift_card();

-- ————————————————————————————————————————— gift card operations (owner only)
create function public.confirm_gift_payment(p_code text) returns public.gift_cards
  language plpgsql security definer set search_path = '' as $$
declare g public.gift_cards;
begin
  if not public.is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into g from public.gift_cards where code = p_code for update;
  if not found then raise exception 'unknown gift card'; end if;
  if g.payment <> 'pending' then raise exception 'gift card is not pending payment'; end if;
  perform set_config('noir.gift_op', 'on', true);
  update public.gift_cards
     set payment = 'paid', balance = amount, activated_at = now(), delivery = 'manual_required'
   where code = p_code returning * into g;
  perform set_config('noir.gift_op', 'off', true);
  insert into public.payments (kind, ref, amount, method) values ('gift_card', g.reference, g.amount, case g.payment_method when 'cod' then 'cod' else 'cash' end);
  return g;
end $$;

create function public.cancel_gift_order(p_code text) returns public.gift_cards
  language plpgsql security definer set search_path = '' as $$
declare g public.gift_cards;
begin
  if not public.is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  perform set_config('noir.gift_op', 'on', true);
  update public.gift_cards set payment = 'cancelled' where code = p_code and payment = 'pending' returning * into g;
  perform set_config('noir.gift_op', 'off', true);
  if not found then raise exception 'only pending orders can be cancelled'; end if;
  return g;
end $$;

create function public.redeem_gift_card(p_code text, p_amount numeric) returns public.gift_cards
  language plpgsql security definer set search_path = '' as $$
declare g public.gift_cards;
begin
  if not public.is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  select * into g from public.gift_cards where code = p_code for update;
  if not found then raise exception 'unknown gift card'; end if;
  if g.payment <> 'paid' then raise exception 'gift card is not active (unpaid)'; end if;
  if g.activated_at < now() - interval '24 months' then raise exception 'gift card has expired'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > g.balance then raise exception 'invalid amount'; end if;
  perform set_config('noir.gift_op', 'on', true);
  update public.gift_cards set balance = balance - p_amount where code = p_code returning * into g;
  perform set_config('noir.gift_op', 'off', true);
  insert into public.gift_card_redemptions (code, amount) values (p_code, p_amount);
  return g;
end $$;

revoke execute on function public.confirm_gift_payment(text), public.cancel_gift_order(text), public.redeem_gift_card(text, numeric) from public, anon;
grant execute on function public.confirm_gift_payment(text), public.cancel_gift_order(text), public.redeem_gift_card(text, numeric) to authenticated;

-- ————————————————————————————————————————— audit log
create function public.write_audit() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, actor_role, action, table_name, record_id, before, after)
  values (
    auth.uid(),
    public.current_staff_role(),
    lower(tg_op),
    tg_table_name,
    coalesce(to_jsonb(new), to_jsonb(old)) ->> (case tg_table_name when 'staff' then 'user_id' when 'gift_cards' then 'code' when 'working_hours' then 'barber_id' else 'id' end),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_staff after insert or update or delete on public.staff for each row execute function public.write_audit();
create trigger audit_barbers after insert or update or delete on public.barbers for each row execute function public.write_audit();
create trigger audit_hours after insert or update or delete on public.working_hours for each row execute function public.write_audit();
create trigger audit_time_off after insert or update or delete on public.time_off for each row execute function public.write_audit();
create trigger audit_services after insert or update or delete on public.services for each row execute function public.write_audit();
create trigger audit_appointments after update or delete on public.appointments for each row execute function public.write_audit();
create trigger audit_gift_cards after insert or update or delete on public.gift_cards for each row execute function public.write_audit();
create trigger audit_redemptions after insert on public.gift_card_redemptions for each row execute function public.write_audit();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function public.write_audit();
create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function public.write_audit();
create trigger audit_settings after insert or update or delete on public.business_settings for each row execute function public.write_audit();
