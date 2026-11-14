-- Hosted integration: existing participants are read only; every write rolls back.
-- Database role/claim simulation is distinct from a real Auth/browser session.
begin;
set local statement_timeout='15s';
do $test$
declare
 resident uuid; artisan_user uuid; artisan uuid; outsider uuid; staff uuid;
 quote uuid:=gen_random_uuid(); first_message uuid:=gen_random_uuid(); reply uuid:=gen_random_uuid();
 conversation uuid; again uuid; denied boolean:=false;
begin
 select r.id,a.user_id,a.id into resident,artisan_user,artisan
 from public.profiles r cross join public.artisan_profiles a join public.profiles u on u.id=a.user_id
 where r.role::text='resident' and r.status::text='active' and r.is_active
 and u.role::text='artisan_verified' and u.status::text='active' and u.is_active and a.is_verified
 and r.id<>a.user_id and not exists(select 1 from public.user_blocks b where (b.user_id=r.id and b.target_user_id=a.user_id) or (b.user_id=a.user_id and b.target_user_id=r.id)) limit 1;
 if resident is null then raise exception 'Un résident et un artisan vérifié sont nécessaires'; end if;
 select id into outsider from public.profiles where id not in(resident,artisan_user) and role::text='resident' and status::text='active' and is_active limit 1;
 select id into staff from public.profiles where role::text='admin' and status::text='active' and is_active limit 1;
 if outsider is null or staff is null then raise exception 'Un tiers résident et un administrateur sont nécessaires'; end if;
 insert into public.service_requests(id,resident_id,artisan_id,title,description)
 values(quote,resident,artisan,'V2 — échange privé annulé après recette','Recette temporaire annulée à la fin du contrôle.');

 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 conversation:=public.bc_v2_start_conversation(artisan_user,'service_request',quote,'Devis de recette','Message résident de recette annulé.',first_message);
 again:=public.bc_v2_start_conversation(artisan_user,'service_request',quote,'Devis de recette','Message résident de recette annulé.',first_message);
 if again<>conversation then raise exception 'Une relance a créé un second échange'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',artisan_user,'role','authenticated')::text,true);
 again:=public.bc_v2_start_conversation(resident,'service_request',quote,'Devis de recette','Réponse artisan de recette annulée.',reply);
 if again<>conversation then raise exception 'Le sens inverse a créé un second échange'; end if;
 perform set_config('role','none',true);
 if (select owner_id from public.conversations where id=conversation)<>resident
 or (select count(*) from public.messages where conversation_id=conversation)<>2
 or (select count(*) from public.conversation_participants where conversation_id=conversation)<>2 then raise exception 'Le contexte de l’échange est incohérent'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 if exists(select 1 from public.messages where conversation_id=conversation) or exists(select 1 from public.conversations where id=conversation) then raise exception 'Un tiers peut lire l’échange privé'; end if;
 begin perform public.bc_v2_start_conversation(resident,'service_request',quote,'Devis de recette','Tentative refusée.',gen_random_uuid()); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un tiers peut rejoindre le devis'; end if;

 -- A normal resident cannot forge their own artisan verification.
 denied:=false;
 begin insert into public.artisan_profiles(id,user_id,business_name,is_verified) values(gen_random_uuid(),outsider,'Profil de recette refusé',true); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un résident peut s’auto-valider artisan'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated')::text,true);
 denied:=false;
 begin delete from public.artisan_profiles where id=artisan; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'La suppression artisan peut rendre public un devis privé'; end if;
 perform set_config('role','none',true);
 if not exists(select 1 from public.service_requests where id=quote and artisan_id=artisan) then raise exception 'Le devis a perdu son contexte privé'; end if;
end;
$test$;
rollback;
select 'PASS: contact résident/artisan dans les deux sens, échange unique, relance, contexte, isolement, refus d’auto-validation et conservation du devis privé ; transaction annulée' as result;
