-- Preserve historical reviews; new service reviews require a completed quote.
-- Restrictive visibility also defeats overlapping legacy permissive SELECTs.
create policy bc_v2_review_visibility on public.reviews as restrictive for select to anon,authenticated using (
 moderation_status='visible' or author_id=(select auth.uid()) or reviewer_id=(select auth.uid()) or target_user_id=(select auth.uid())
 or (select public.is_moderator_or_admin())
);

create or replace function bc_v2_private.guard_service_review()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_request public.service_requests%rowtype;
 v_interaction public.trust_interactions%rowtype; v_artisan public.artisan_profiles%rowtype;
begin
 if tg_op='UPDATE' and (old.source_type='service_request' or exists(select 1 from public.trust_interactions where id=old.interaction_id and source_type='service_request')) then
  -- A moderation decision may change visibility, never the author or the proof.
  if (to_jsonb(new)-'moderation_status'-'moderation_note'-'moderated_by'-'moderated_at'-'updated_at') is distinct from
     (to_jsonb(old)-'moderation_status'-'moderation_note'-'moderated_by'-'moderated_at'-'updated_at') then
    raise exception 'Un avis vérifié ne peut pas être réattribué ou réécrit' using errcode='42501'; end if;
  if exists(select 1 from public.profiles where id=v_actor and role::text in ('admin','moderator') and status::text='active' and is_active) then return new; end if;
  raise exception 'Seule la modération peut changer la visibilité de cet avis' using errcode='42501';
 end if;
 if new.source_type='service_request' or exists(select 1 from public.trust_interactions where id=new.interaction_id and source_type='service_request') then
  select * into v_interaction from public.trust_interactions where id=new.interaction_id;
  select * into v_request from public.service_requests where id=v_interaction.source_id;
  select * into v_artisan from public.artisan_profiles where id=v_request.artisan_id;
  if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active)
   or v_request.id is null or v_artisan.id is null or v_interaction.id is null
   or new.source_type is distinct from 'service_request' or new.source_id is distinct from v_request.id
   or new.reviewer_id is distinct from v_actor or new.author_id is distinct from v_actor
   or new.target_user_id is distinct from v_artisan.user_id or new.artisan_id is distinct from v_artisan.id
   or v_request.resident_id is distinct from v_actor or v_artisan.user_id=v_actor
   or v_interaction.requester_id is distinct from v_actor or v_interaction.receiver_id is distinct from v_artisan.user_id
   or v_request.status::text<>'completed' or v_interaction.status is distinct from 'done' or v_interaction.review_unlocked is distinct from true
   or v_interaction.completed_at is null or v_interaction.completed_at<now()-interval '30 days'
   or new.moderation_status is distinct from 'visible' or new.moderated_by is not null or new.moderated_at is not null or new.moderation_note is not null then
    raise exception 'Un devis terminé et vérifié est nécessaire pour cet avis' using errcode='42501'; end if;
 end if;
 return new;
end;
$fn$;
revoke all on function bc_v2_private.guard_service_review() from public,anon,authenticated;
create trigger bc_v2_verified_service_review before insert or update on public.reviews
for each row execute function bc_v2_private.guard_service_review();

create or replace function bc_v2_private.submit_service_review(p_id uuid,p_request uuid,p_rating integer,p_comment text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_request public.service_requests%rowtype;
 v_artisan public.artisan_profiles%rowtype; v_interaction public.trust_interactions%rowtype;
 v_existing public.reviews%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active) then raise exception 'Compte actif requis' using errcode='42501'; end if;
 select * into v_request from public.service_requests where id=p_request for update;
 if v_request.id is null or v_request.resident_id<>v_actor then raise exception 'Vous ne pouvez pas évaluer cette intervention' using errcode='42501'; end if;
 select * into v_artisan from public.artisan_profiles where id=v_request.artisan_id for update;
 select * into v_interaction from public.trust_interactions where source_type='service_request' and source_id=p_request and requester_id=v_actor for update;
 if v_artisan.id is null or v_artisan.user_id=v_actor or v_interaction.id is null or v_interaction.receiver_id<>v_artisan.user_id then raise exception 'Preuve d’intervention indisponible' using errcode='42501'; end if;
 select * into v_existing from public.reviews where id=p_id;
 if v_existing.id is not null then
  if v_existing.author_id=v_actor and v_existing.source_type='service_request' and v_existing.source_id=p_request
    and v_existing.rating=p_rating and coalesce(v_existing.comment,'')=btrim(coalesce(p_comment,'')) then return p_id; end if;
  raise exception 'Cet identifiant d’avis a déjà été utilisé' using errcode='22023';
 end if;
 if v_request.status::text<>'completed' or v_interaction.status is distinct from 'done' or v_interaction.review_unlocked is distinct from true
  or v_interaction.completed_at is null or v_interaction.completed_at<now()-interval '30 days' then raise exception 'L’avis est disponible pendant 30 jours après la fin de l’intervention' using errcode='22023'; end if;
 if p_id is null or p_rating is null or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment,''))) not between 10 and 2000 then
  raise exception 'Choisissez une note de 1 à 5 et un avis de 10 à 2000 caractères' using errcode='22023'; end if;
 -- Retain the historical one-review-per-resident/artisan contract.
 if v_interaction.review_requester_done or exists(select 1 from public.reviews where artisan_id=v_artisan.id and reviewer_id=v_actor) then
  raise exception 'Vous avez déjà donné votre avis sur cet artisan' using errcode='22023'; end if;
 insert into public.reviews(id,artisan_id,reviewer_id,author_id,target_user_id,interaction_id,source_type,source_id,rating,comment,moderation_status)
 values(p_id,v_artisan.id,v_actor,v_actor,v_artisan.user_id,v_interaction.id,'service_request',p_request,p_rating,btrim(p_comment),'visible');
 update public.trust_interactions set review_requester_done=true,updated_at=now() where id=v_interaction.id;
 insert into public.notifications(user_id,type,title,message,link) values(v_artisan.user_id,'new_review','Un avis sur votre intervention',
 'Un résident a publié un avis '||p_rating::text||'/5 après une intervention.','/dashboard/avis');
 return p_id;
end;
$fn$;
revoke all on function bc_v2_private.submit_service_review(uuid,uuid,integer,text) from public,anon;
grant execute on function bc_v2_private.submit_service_review(uuid,uuid,integer,text) to authenticated;
create or replace function public.bc_v2_submit_service_review(p_id uuid,p_request uuid,p_rating integer,p_comment text)
returns uuid language sql security invoker set search_path='' as $fn$
 select bc_v2_private.submit_service_review(p_id,p_request,p_rating,p_comment);
$fn$;
revoke all on function public.bc_v2_submit_service_review(uuid,uuid,integer,text) from public,anon;
grant execute on function public.bc_v2_submit_service_review(uuid,uuid,integer,text) to authenticated;
notify pgrst,'reload schema';
