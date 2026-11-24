-- Barber status rules (migration 20261124000000_barber_status_rules.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- seed, as the database owner: Idris has one appointment starting in 20 minutes and
-- one in two days; Theo has one today (another barber's appointment).
insert into public.clients (id, name, phone) values ('c0000000-0000-0000-0000-000000000009', 'Early Client', '+31600000099');
insert into public.appointments (id, client_id, barber_id, service_id, starts_at, ends_at, price, status) values
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'idris', 'skin-fade', now() + interval '20 min', now() + interval '65 min', 48, 'confirmed'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000009', 'idris', 'skin-fade', now() + interval '2 day', now() + interval '2 day 45 min', 48, 'booked'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000009', 'theo', 'skin-fade', now() + interval '10 min', now() + interval '55 min', 48, 'confirmed');

set role authenticated;
select login('00000000-0000-0000-0000-000000000002'); -- Idris (barber)
-- the reported bug: started early, then Done
select t_fails($$update public.appointments set status = 'completed' where id = 'b0000000-0000-0000-0000-000000000001'$$, 'cannot complete a confirmed appointment that has not started');
select t_fails($$update public.appointments set status = 'no_show' where id = 'b0000000-0000-0000-0000-000000000001'$$, 'cannot mark a no-show before the start time');
update public.appointments set status = 'arrived' where id = 'b0000000-0000-0000-0000-000000000001';
update public.appointments set status = 'in_chair' where id = 'b0000000-0000-0000-0000-000000000001';
update public.appointments set status = 'completed' where id = 'b0000000-0000-0000-0000-000000000001';
select t_ok((select status from public.appointments where id = 'b0000000-0000-0000-0000-000000000001') = 'completed', 'barber completes own appointment started early (Arrived → Start → Done)');
select t_fails($$update public.appointments set status = 'in_chair' where id = 'b0000000-0000-0000-0000-000000000001'$$, 'a completed appointment is final for the barber');
-- cancel and day rules
select t_fails($$update public.appointments set status = 'arrived' where id = 'b0000000-0000-0000-0000-000000000002'$$, 'arrival is recorded on the day itself');
update public.appointments set status = 'cancelled' where id = 'b0000000-0000-0000-0000-000000000002';
select t_ok((select status from public.appointments where id = 'b0000000-0000-0000-0000-000000000002') = 'cancelled', 'barber cancels own future appointment');
-- another barber's appointment: invisible and untouchable
update public.appointments set status = 'completed' where id = 'b0000000-0000-0000-0000-000000000003';
select t_ok((select count(*) from public.appointments where id = 'b0000000-0000-0000-0000-000000000003') = 0, 'barber cannot see another barber''s appointment');
select t_fails($$update public.appointments set paid_with = 'cash' where id = 'b0000000-0000-0000-0000-000000000001'$$, 'barber cannot record payments');
reset role;
select t_ok((select status from public.appointments where id = 'b0000000-0000-0000-0000-000000000003') = 'confirmed', 'another barber''s appointment was not changed');

set role authenticated;
select login('00000000-0000-0000-0000-000000000001'); -- owner
update public.appointments set status = 'completed', paid_with = 'card' where id = 'b0000000-0000-0000-0000-000000000003';
select t_ok((select status = 'completed' and paid_with = 'card' from public.appointments where id = 'b0000000-0000-0000-0000-000000000003'), 'owner can complete any barber''s appointment and record payment');
update public.appointments set status = 'confirmed' where id = 'b0000000-0000-0000-0000-000000000001';
select t_ok((select status from public.appointments where id = 'b0000000-0000-0000-0000-000000000001') = 'confirmed', 'owner can correct a status');
reset role;
select t_ok((select count(*) from public.appointments where id::text like 'b0000000%') = 3, 'no appointment was duplicated or deleted');
