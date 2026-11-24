-- The same rules for EVERY barber: three barber users (an existing one, another existing one,
-- and one added now) each complete their own appointment and cannot touch anyone else's.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- seed, as the database owner
insert into auth.users values ('00000000-0000-0000-0000-000000000006', 'nora@example.com');
-- Theo's existing login (deactivated in 10_permissions) is reactivated, as the owner would
update public.staff set active = true where barber_id = 'theo';
insert into public.barbers (id, name, email, phone, commission) values ('nora', 'Nora Vale', 'nora@example.com', '+31600000006', 0.45);
insert into public.staff (user_id, role, barber_id, active) values ('00000000-0000-0000-0000-000000000006', 'barber', 'nora', true);
insert into public.appointments (id, client_id, barber_id, service_id, starts_at, ends_at, price, status) values
  ('d0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000009', 'idris', 'skin-fade', now() + interval '3 hour', now() + interval '3 hour 45 min', 48, 'in_chair'),
  ('d0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000009', 'theo',  'skin-fade', now() + interval '4 hour', now() + interval '4 hour 45 min', 48, 'in_chair'),
  ('d0000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-000000000009', 'nora',  'skin-fade', now() + interval '5 hour', now() + interval '5 hour 45 min', 48, 'in_chair');

-- each barber tries their own and both others' appointments
create function pg_temp.try_all(who text) returns void language plpgsql as $$ begin
  update public.appointments set status = 'completed' where id in ('d0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-00000000000c');
  perform t_ok((select count(*) from public.appointments where id::text like 'd0000000%') = 1, who || ' sees exactly one of the three appointments (their own)');
end $$;

set role authenticated;
select login('00000000-0000-0000-0000-000000000002'); select pg_temp.try_all('Idris (barber A)');
select login('00000000-0000-0000-0000-000000000004'); select pg_temp.try_all('Theo (barber B)');
select login('00000000-0000-0000-0000-000000000006'); select pg_temp.try_all('Nora (barber added now)');
reset role;
select t_ok((select status from public.appointments where id = 'd0000000-0000-0000-0000-00000000000a') = 'completed', 'Idris completed his own appointment (started early)');
select t_ok((select status from public.appointments where id = 'd0000000-0000-0000-0000-00000000000b') = 'completed', 'Theo completed his own appointment (started early)');
select t_ok((select status from public.appointments where id = 'd0000000-0000-0000-0000-00000000000c') = 'completed', 'Nora (new barber) completed her own appointment (started early)');
-- cross-barber attempts did nothing: verify with fresh in_chair rows and explicit cross updates
select login('00000000-0000-0000-0000-000000000001'); -- the owner resets them
update public.appointments set status = 'in_chair' where id::text like 'd0000000%';
set role authenticated;
select login('00000000-0000-0000-0000-000000000002');
update public.appointments set status = 'completed' where id = 'd0000000-0000-0000-0000-00000000000b';
select login('00000000-0000-0000-0000-000000000004');
update public.appointments set status = 'completed' where id = 'd0000000-0000-0000-0000-00000000000a';
select login('00000000-0000-0000-0000-000000000006');
update public.appointments set status = 'completed' where id in ('d0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000b');
reset role;
select t_ok((select count(*) from public.appointments where id::text like 'd0000000%' and status = 'in_chair') = 3, 'barber A → B, B → A and the new barber → A/B: all rejected, nothing changed');
-- owner manages all of them
set role authenticated;
select login('00000000-0000-0000-0000-000000000001');
update public.appointments set status = 'completed', paid_with = 'card' where id::text like 'd0000000%';
select t_ok((select count(*) from public.appointments where id::text like 'd0000000%' and status = 'completed' and paid_with = 'card') = 3, 'owner completes and records payment for all three barbers');
reset role;
select t_ok((select count(*) from public.appointments where id::text like 'd0000000%') = 3, 'no duplicates, nothing deleted');
