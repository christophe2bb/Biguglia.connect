-- Hosted integration check. Requires a database administrator connection.
-- It simulates database roles/claims; it does not test Auth token issuance.
-- Every fixture and notification is rolled back. Existing profiles are only read.
begin;
set local statement_timeout='15s';
do $test$
declare
 owner_id uuid; borrower_id uuid; outsider_id uuid; fixture uuid:=gen_random_uuid();
 request_id uuid:=gen_random_uuid(); message_id uuid:=gen_random_uuid(); conversation_id uuid; again uuid;
 denied boolean:=false; count_rows integer;
begin
 select a.id,b.id into owner_id,borrower_id from public.profiles a cross join public.profiles b
 where a.id<>b.id and a.role::text='resident' and b.role::text='resident'
 and a.status::text='active' and a.is_active and b.status::text='active' and b.is_active
 and not exists(select 1 from public.user_blocks where (user_id=a.id and target_user_id=b.id) or (user_id=b.id and target_user_id=a.id)) limit 1;
 if owner_id is null then raise exception 'Deux comptes résidents actifs non bloqués sont nécessaires pour cette recette'; end if;
 select id into outsider_id from public.profiles where id not in (owner_id,borrower_id) and role::text not in ('admin','moderator') and status::text='active' and is_active limit 1;
 if outsider_id is null then raise exception 'Un troisième compte actif est nécessaire pour vérifier l’isolement'; end if;
 insert into public.equipment_items(id,owner_id,title,description,pickup_location,status,is_available)
  values(fixture,owner_id,'V2 — fixture transactionnelle','Données de recette annulées en fin de transaction.','Biguglia','disponible',true);
 insert into public.equipment_requests(id,equipment_id,requester_id,message,requested_start_date,requested_end_date)
  values(request_id,fixture,borrower_id,'Demande de recette transactionnelle.',current_date+1,current_date+2);

 perform set_config('request.jwt.claims',jsonb_build_object('sub',borrower_id,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 begin perform public.bc_v2_equipment_action(request_id,'accept'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un emprunteur a pu accepter sa propre demande'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 perform public.bc_v2_equipment_action(request_id,'accept');
 perform public.bc_v2_equipment_action(request_id,'accept');
 perform public.bc_v2_equipment_action(request_id,'handover');
 perform public.bc_v2_equipment_action(request_id,'return');
 perform public.bc_v2_equipment_action(request_id,'return');
 perform set_config('role','none',true);
 if (select status from public.equipment_items where id=fixture)<>'disponible'
    or (select status from public.equipment_requests where id=request_id)<>'terminee'
    or (select count(*) from public.equipment_loans where equipment_id=fixture)<>1
    or not exists(select 1 from public.trust_interactions where source_id=fixture and status='done' and review_unlocked)
    or (select count(*) from public.notifications where link='/materiel/'||fixture::text)<>3 then
  raise exception 'Le cycle de prêt ou ses effets ne sont pas cohérents';
 end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',borrower_id,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 conversation_id:=public.bc_v2_start_conversation(owner_id,'equipment',fixture,'Recette V2','Message de recette annulé.',message_id);
 again:=public.bc_v2_start_conversation(owner_id,'equipment',fixture,'Recette V2','Message de recette annulé.',message_id);
 if again<>conversation_id then raise exception 'Une relance a créé une seconde conversation'; end if;
 perform set_config('role','none',true);
 select count(*) into count_rows from public.messages where id=message_id;
 if count_rows<>1 then raise exception 'Le message initial a été dupliqué'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 if exists(select 1 from public.messages where id=message_id)
    or exists(select 1 from public.conversations where id=conversation_id) then raise exception 'Un tiers a pu lire l’échange privé'; end if;
 -- Test the resident gate without changing any existing profile.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',borrower_id,'role','authenticated')::text,true);
 denied:=false;
 begin perform public.bc_v2_admin_decision(owner_id,'suspend','Motif de recette sans application.'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un résident a pu décider sur un compte'; end if;
 perform set_config('role','none',true);
end;
$test$;
rollback;
select 'PASS: prêt, relances, notifications, confiance, conversation, message unique, isolement et refus résident ; transaction annulée' as result;
