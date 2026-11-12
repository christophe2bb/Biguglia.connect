-- Real hosted PostgreSQL, existing identities read only, every fixture rolled back.
-- SET LOCAL claims test authorization in SQL, not a real Auth/browser login.
begin;
set local statement_timeout='15s';
do $test$
declare
 resident uuid; artisan_user uuid; artisan uuid; outsider uuid;
 quote uuid:=gen_random_uuid(); quote_other uuid:=gen_random_uuid();
 appointment uuid:=gen_random_uuid(); appointment_other uuid:=gen_random_uuid();
 booking_date date:=(now() at time zone 'Europe/Paris')::date+7;
 denied boolean:=false;
begin
 select r.id,a.user_id,a.id into resident,artisan_user,artisan
 from public.profiles r cross join public.artisan_profiles a join public.profiles u on u.id=a.user_id
 where r.role::text='resident' and r.status::text='active' and r.is_active
 and u.role::text='artisan_verified' and u.status::text='active' and u.is_active and a.is_verified
 and r.id<>a.user_id and not exists(select 1 from public.user_blocks b where (b.user_id=r.id and b.target_user_id=a.user_id) or (b.user_id=a.user_id and b.target_user_id=r.id)) limit 1;
 if resident is null then raise exception 'Un résident et un artisan vérifié actifs non bloqués sont nécessaires'; end if;
 select id into outsider from public.profiles where id not in (resident,artisan_user) and role::text not in ('admin','moderator') and status::text='active' and is_active limit 1;
 if outsider is null then raise exception 'Un tiers non modérateur est nécessaire'; end if;
 insert into public.service_requests(id,resident_id,artisan_id,title,description)
 values(quote,resident,artisan,'V2 — rendez-vous annulé après recette','Recette temporaire sans modification de données existantes.'),
 (quote_other,resident,artisan,'V2 — conflit de rendez-vous annulé après recette','Recette temporaire sans modification de données existantes.');

 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 perform public.bc_v2_propose_appointment(appointment,quote,booking_date,'09:00',90,'Accès de recette.');
 perform public.bc_v2_propose_appointment(appointment,quote,booking_date,'09:00',90,'Accès de recette.');
 perform public.bc_v2_propose_appointment(appointment_other,quote_other,booking_date,'09:30',60,null);
 begin perform public.bc_v2_appointment_action(appointment,'accept'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Le proposant a pu accepter son propre rendez-vous'; end if;
 denied:=false;
 begin update public.appointments set proposed_by=artisan_user where id=appointment; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Une écriture directe a contourné le contrat'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 if exists(select 1 from public.appointments where id=appointment) or exists(select 1 from public.service_requests where id=quote) then raise exception 'Un tiers lit un devis ou rendez-vous privé'; end if;
 denied:=false;
 begin perform public.bc_v2_appointment_action(appointment,'accept'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un tiers peut confirmer le rendez-vous'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',artisan_user,'role','authenticated')::text,true);
 perform public.bc_v2_appointment_action(appointment,'accept');
 perform public.bc_v2_appointment_action(appointment,'accept');
 denied:=false;
 begin perform public.bc_v2_appointment_action(appointment_other,'accept'); exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Deux rendez-vous confirmés se chevauchent'; end if;
 denied:=false;
 begin perform public.bc_v2_appointment_action(appointment,'complete'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'L’artisan peut clore seul le devis du résident'; end if;
 perform set_config('role','none',true);
 if (select status::text from public.service_requests where id=quote)<>'scheduled'
 or (select status::text from public.appointments where id=appointment)<>'accepted'
 or (select status::text from public.appointments where id=appointment_other)<>'pending'
 or (select count(*) from public.notifications where link='/demandes/'||quote::text)<>2 then raise exception 'La confirmation et ses notifications sont incohérentes'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 perform public.bc_v2_appointment_action(appointment,'complete');
 perform public.bc_v2_appointment_action(appointment,'complete');
 perform set_config('role','none',true);
 if (select status::text from public.service_requests where id=quote)<>'completed'
 or (select status::text from public.appointments where id=appointment)<>'completed'
 or not exists(select 1 from public.trust_interactions where source_type='service_request' and source_id=quote and status='done' and review_unlocked)
 or (select count(*) from public.notifications where link='/demandes/'||quote::text or (type='review_request' and user_id=resident and created_at>=transaction_timestamp()))<>4 then raise exception 'La clôture, l’avis ou les notifications sont incohérents'; end if;

 -- Closing a quote through its normal path also frees pending appointments.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 update public.service_requests set status='cancelled' where id=quote_other;
 perform set_config('role','none',true);
 if (select status::text from public.appointments where id=appointment_other)<>'cancelled' then raise exception 'Un devis clos garde un créneau actif'; end if;
end;
$test$;
rollback;
select 'PASS: proposition, relance, droits, isolement, refus de chevauchement, confirmation, clôture, avis et annulation ; toutes les données de recette annulées' as result;
