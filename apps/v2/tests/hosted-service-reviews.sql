-- Read existing participants; all fixtures, stats and notifications roll back.
-- SQL claims verify database authorization, not Auth login or email delivery.
begin;
set local statement_timeout='15s';
do $test$
declare
 resident uuid; artisan_user uuid; artisan uuid; outsider uuid; staff uuid;
 quote uuid:=gen_random_uuid(); review uuid:=gen_random_uuid(); denied boolean:=false;
begin
 select r.id,a.user_id,a.id into resident,artisan_user,artisan
 from public.profiles r cross join public.artisan_profiles a join public.profiles u on u.id=a.user_id
 where r.role::text='resident' and r.status::text='active' and r.is_active
 and u.role::text='artisan_verified' and u.status::text='active' and u.is_active and a.is_verified
 and r.id<>a.user_id and not exists(select 1 from public.reviews v where v.artisan_id=a.id and v.reviewer_id=r.id)
 and not exists(select 1 from public.user_blocks b where (b.user_id=r.id and b.target_user_id=a.user_id) or (b.user_id=a.user_id and b.target_user_id=r.id)) limit 1;
 if resident is null then raise exception 'Un résident sans avis préalable sur cet artisan est nécessaire'; end if;
 select id into outsider from public.profiles where id not in (resident,artisan_user) and role::text not in ('admin','moderator') and status::text='active' and is_active limit 1;
 select id into staff from public.profiles where role::text='admin' and status::text='active' and is_active limit 1;
 if outsider is null or staff is null then raise exception 'Un tiers et un administrateur actifs sont nécessaires'; end if;
 insert into public.service_requests(id,resident_id,artisan_id,title,description)
 values(quote,resident,artisan,'V2 — avis vérifié annulé après recette','Données de recette exclusivement temporaires.');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 begin perform public.bc_v2_submit_service_review(review,quote,5,'Avis temporaire après intervention.'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un avis a été créé sans intervention terminée'; end if;
 update public.service_requests set status='completed' where id=quote;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 denied:=false;
 begin perform public.bc_v2_submit_service_review(review,quote,5,'Avis temporaire après intervention.'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Un tiers a pu évaluer l’intervention'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 perform public.bc_v2_submit_service_review(review,quote,5,'Avis temporaire après intervention.');
 perform public.bc_v2_submit_service_review(review,quote,5,'Avis temporaire après intervention.');
 denied:=false;
 begin update public.reviews set target_user_id=outsider where id=review; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'L’auteur a pu réattribuer son avis vérifié'; end if;
 perform set_config('role','none',true);
 if (select count(*) from public.reviews where id=review and reviewer_id=resident and author_id=resident and artisan_id=artisan and target_user_id=artisan_user and source_id=quote)<>1
 or not exists(select 1 from public.trust_interactions where source_type='service_request' and source_id=quote and review_requester_done)
 or not exists(select 1 from public.trust_profile_stats where profile_id=artisan_user and reviews_received>0)
 or (select count(*) from public.notifications where user_id=artisan_user and type='new_review' and message='Un résident a publié un avis 5/5 après une intervention.' and created_at>=transaction_timestamp())<>1 then
  raise exception 'L’avis, ses statistiques ou sa notification ne sont pas cohérents'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 update public.reviews set moderation_status='hidden',moderated_by=staff,moderated_at=now(),moderation_note='Motif de recette sans conservation.' where id=review;
 if exists(select 1 from public.trust_profile_stats s where s.profile_id=artisan_user and
  (s.reviews_received<>(select count(*) from public.reviews where target_user_id=artisan_user and moderation_status='visible')
  or s.avg_rating<>(select coalesce(round(avg(rating)::numeric,2),0) from public.reviews where target_user_id=artisan_user and moderation_status='visible')
  or s.dist_1+s.dist_2+s.dist_3+s.dist_4+s.dist_5<>s.reviews_received)) then
  raise exception 'Les statistiques d’un avis masqué sont incohérentes'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 if exists(select 1 from public.reviews where id=review) then raise exception 'Un tiers peut lire un avis masqué'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 if not exists(select 1 from public.reviews where id=review) then raise exception 'L’auteur ne voit plus son avis modéré'; end if;
 perform set_config('role','none',true);
end;
$test$;
rollback;
select 'PASS: avis après devis terminé, droits, relance sans doublon, statistiques, notification, preuve immuable et visibilité après modération ; transaction annulée' as result;
