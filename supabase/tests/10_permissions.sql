-- Permission tests for the Command Center schema.
-- Run: supabase/tests/run.sh  (local PostgreSQL 16; never against production)
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- ——— test helpers ———
create function public.t_ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS %', msg;
end $$;
create function public.t_fails(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'PASS % (blocked: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — statement was allowed', msg;
end $$;
create function public.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false)
$$;
set client_min_messages = notice;

-- ——— seed (as the database owner) ———
insert into auth.users values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'idris@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'lucas@example.com'),
  ('00000000-0000-0000-0000-000000000004', 'former@example.com');
insert into public.barbers (id, name, email, phone, commission) values
  ('marco', 'Marco Velden', 'marco@example.com', '+31600000000', 0),
  ('idris', 'Idris Haddad', 'idris@example.com', '+31600000001', 0.45),
  ('lucas', 'Lucas Moreau', 'lucas@example.com', '+31600000002', 0.45),
  ('theo', 'Theo Brandt', 'theo@example.com', '+31600000003', 0.45);
insert into public.staff (user_id, role, barber_id, active) values
  ('00000000-0000-0000-0000-000000000001', 'owner', 'marco', true),
  ('00000000-0000-0000-0000-000000000002', 'barber', 'idris', true),
  ('00000000-0000-0000-0000-000000000003', 'barber', 'lucas', true),
  ('00000000-0000-0000-0000-000000000004', 'barber', 'theo', false);
insert into public.working_hours values ('idris', 2, '10:00', '20:00'), ('lucas', 2, '10:00', '20:00');
insert into public.time_off (barber_id, starts_on, ends_on, reason) values ('lucas', current_date + 9, current_date + 11, 'Course');
insert into public.services (id, category, duration_min, price) values ('skin-fade', 'haircuts', 45, 48), ('hidden-service', 'haircuts', 30, 20);
update public.services set active = false where id = 'hidden-service';
insert into public.clients (id, name, phone, email, marketing) values
  ('c0000000-0000-0000-0000-000000000001', 'Client of Idris', '+31611111111', 'one@example.com', true),
  ('c0000000-0000-0000-0000-000000000002', 'Client of Lucas', '+31622222222', 'two@example.com', true);
insert into public.appointments (id, client_id, barber_id, service_id, starts_at, ends_at, price) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'idris', 'skin-fade', now() + interval '1 day', now() + interval '1 day 45 min', 48),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'lucas', 'skin-fade', now() + interval '1 day', now() + interval '1 day 45 min', 48);
insert into public.gift_cards (code, reference, amount, recipient, sender, send_to, delivery_method, payment_method) values
  ('NOIR-AAAA-BBBB-CCCC', 'GC-AAAAAA', 100, 'Lena', 'Jonas', 'lena@example.com', 'email', 'cod');
insert into public.membership_plans values ('club', 'Club', 129, true);
insert into public.memberships (client_id, plan_id, renews) values ('c0000000-0000-0000-0000-000000000001', 'club', current_date + 20);
insert into public.business_settings default values;

-- ——— anonymous website visitor ———
set role anon;
select login(null);
select t_ok((select count(*) from public.services) = 1, 'anon sees only active services');
select t_ok((select count(*) from (select id, name, bio from public.barbers) b) = 4, 'anon reads public barber columns');
select t_fails('select email from public.barbers', 'anon cannot read barber email/phone');
select t_ok((select count(*) from public.appointments) = 0, 'anon sees no appointments');
select t_ok((select count(*) from public.clients) = 0, 'anon sees no clients');
select t_ok((select count(*) from public.staff) = 0, 'anon sees no staff');
select t_ok((select count(*) from public.gift_cards) = 0, 'anon sees no gift cards');
select t_fails('select * from public.barber_clients', 'anon cannot use the barber client view');
select t_fails($$select public.confirm_gift_payment('NOIR-AAAA-BBBB-CCCC')$$, 'anon cannot activate gift cards');
reset role;

-- ——— barber Idris ———
set role authenticated;
select login('00000000-0000-0000-0000-000000000002');
select t_ok((select count(*) from public.appointments) = 1, 'barber sees exactly 1 appointment');
select t_ok((select count(*) from public.appointments where barber_id <> 'idris') = 0, 'barber sees no other barber''s appointments');
select t_ok((select count(*) from public.appointments where id = 'a0000000-0000-0000-0000-000000000002') = 0, 'barber cannot fetch another barber''s appointment by id');
select t_ok((select count(*) from public.clients) = 0, 'barber cannot read the clients table');
select t_ok((select count(*) from public.barber_clients) = 1, 'barber sees only their own client via the limited view');
select t_fails('select email from public.barber_clients', 'barber view has no email column');
select t_ok((select count(*) from public.gift_cards) = 0, 'barber sees no gift cards');
select t_ok((select count(*) from public.payments) = 0, 'barber sees no payments');
select t_ok((select count(*) from public.memberships) = 0, 'barber sees no memberships');
select t_ok((select count(*) from public.business_settings) = 0, 'barber sees no business settings');
select t_ok((select count(*) from public.audit_log) = 0, 'barber cannot read the audit log');
select t_ok((select count(*) from public.staff) = 1, 'barber sees only their own staff row');
select t_ok((select count(*) from public.working_hours where barber_id = 'lucas') = 0, 'barber cannot see another barber''s hours');
select t_ok((select count(*) from public.time_off) = 0, 'barber cannot see another barber''s time off');
select t_ok((select count(*) from public.barbers) = 1, 'barber sees only their own barber record');
update public.appointments set status = 'confirmed' where id = 'a0000000-0000-0000-0000-000000000001';
select t_ok((select status from public.appointments where id = 'a0000000-0000-0000-0000-000000000001') = 'confirmed', 'barber can confirm own appointment');
select t_fails($$update public.appointments set status = 'completed' where id = 'a0000000-0000-0000-0000-000000000001'$$, 'barber cannot skip to completed');
select t_fails($$update public.appointments set price = 1 where id = 'a0000000-0000-0000-0000-000000000001'$$, 'barber cannot change the price');
select t_fails($$update public.appointments set barber_id = 'lucas' where id = 'a0000000-0000-0000-0000-000000000001'$$, 'barber cannot move an appointment to someone else');
update public.appointments set status = 'cancelled' where id = 'a0000000-0000-0000-0000-000000000002';
select t_fails($$insert into public.appointments (client_id, barber_id, service_id, starts_at, ends_at, price) values ('c0000000-0000-0000-0000-000000000001', 'idris', 'skin-fade', now() + interval '3 day', now() + interval '3 day 45 min', 48)$$, 'barber cannot create appointments');
update public.barbers set bio = 'Fades and tapers.' where id = 'idris';
select t_fails($$update public.barbers set commission = 0.9 where id = 'idris'$$, 'barber cannot change own commission');
select t_fails($$update public.barbers set name = 'Boss' where id = 'idris'$$, 'barber cannot change own name');
update public.barbers set bio = 'hacked' where id = 'lucas';
select t_fails($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000004', 'owner')$$, 'barber cannot create accounts');
update public.staff set role = 'owner' where user_id = '00000000-0000-0000-0000-000000000002';
select t_fails($$select public.confirm_gift_payment('NOIR-AAAA-BBBB-CCCC')$$, 'barber cannot activate gift cards');
select t_fails($$select public.redeem_gift_card('NOIR-AAAA-BBBB-CCCC', 10)$$, 'barber cannot redeem gift cards');
select t_fails($$delete from public.audit_log$$, 'barber cannot delete the audit log');
reset role;
select t_ok((select status from public.appointments where id = 'a0000000-0000-0000-0000-000000000002') = 'booked', 'other barber''s appointment untouched');
select t_ok((select bio from public.barbers where id = 'lucas') = '', 'other barber''s profile untouched');
select t_ok((select bio from public.barbers where id = 'idris') = 'Fades and tapers.', 'barber profile edit saved');
select t_ok((select role from public.staff where user_id = '00000000-0000-0000-0000-000000000002') = 'barber', 'barber could not promote themselves');

-- ——— deactivated barber ———
set role authenticated;
select login('00000000-0000-0000-0000-000000000004');
select t_ok((select count(*) from public.appointments) = 0 and (select count(*) from public.barber_clients) = 0, 'deactivated barber sees nothing');
reset role;

-- ——— owner ———
set role authenticated;
select login('00000000-0000-0000-0000-000000000001');
select t_ok((select count(*) from public.appointments) = 2 and (select count(*) from public.clients) = 2, 'owner sees all appointments and clients');
select t_fails($$update public.gift_cards set payment = 'paid', balance = 100, activated_at = now() where code = 'NOIR-AAAA-BBBB-CCCC'$$, 'owner cannot bypass the activation function');
select t_fails($$select public.redeem_gift_card('NOIR-AAAA-BBBB-CCCC', 10)$$, 'unpaid gift card cannot be redeemed');
select public.confirm_gift_payment('NOIR-AAAA-BBBB-CCCC');
select t_ok((select payment = 'paid' and balance = 100 and activated_at is not null from public.gift_cards where code = 'NOIR-AAAA-BBBB-CCCC'), 'confirming payment activates the card');
select t_fails($$select public.confirm_gift_payment('NOIR-AAAA-BBBB-CCCC')$$, 'a card cannot be activated twice');
select public.redeem_gift_card('NOIR-AAAA-BBBB-CCCC', 30);
select t_ok((select balance from public.gift_cards where code = 'NOIR-AAAA-BBBB-CCCC') = 70, 'redeeming lowers the balance');
select t_fails($$select public.redeem_gift_card('NOIR-AAAA-BBBB-CCCC', 80)$$, 'cannot redeem more than the balance');
select t_fails($$insert into public.gift_cards (code, reference, amount, recipient, sender, send_to, delivery_method, payment_method) values ('NOIR-AAAA-BBBB-CCCC', 'GC-BBBBBB', 50, 'x', 'y', 'z', 'email', 'cod')$$, 'gift card codes are unique');
select t_fails($$insert into public.gift_cards (code, reference, amount, recipient, sender, send_to, delivery_method, payment_method, payment, balance, activated_at) values ('NOIR-DDDD-EEEE-FFFF', 'GC-CCCCCC', 50, 'x', 'y', 'z', 'email', 'cod', 'paid', 50, now())$$, 'new gift cards cannot start out paid');
select t_fails($$insert into public.appointments (client_id, barber_id, service_id, starts_at, ends_at, price) select client_id, barber_id, service_id, starts_at + interval '15 min', ends_at + interval '15 min', price from public.appointments where id = 'a0000000-0000-0000-0000-000000000001'$$, 'a barber cannot be double-booked');
select t_fails($$update public.staff set active = false where user_id = '00000000-0000-0000-0000-000000000001'$$, 'the last owner cannot be deactivated');
update public.staff set active = false where user_id = '00000000-0000-0000-0000-000000000003';
select t_ok((select count(*) from public.audit_log where actor = '00000000-0000-0000-0000-000000000002') >= 2, 'barber actions are in the audit log');
select t_ok((select count(*) from public.audit_log where actor = '00000000-0000-0000-0000-000000000001' and table_name = 'gift_cards') >= 2, 'owner gift card actions are in the audit log');
select t_fails($$update public.audit_log set action = 'x'$$, 'audit log cannot be edited, even by the owner');
reset role;

set role authenticated;
select login('00000000-0000-0000-0000-000000000003');
select t_ok((select count(*) from public.appointments) = 0, 'barber deactivated by the owner loses access immediately');
reset role;
