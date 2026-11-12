-- Additive V2 workflows; requires v2_secure_client_contract.
-- Loan lifecycle: one database transaction and one item lock for every decision.
-- The existing client and tables remain available; V2 does not chain partial PATCHes.
create or replace function bc_v2_private.equipment_action(p_request uuid,p_action text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_item_id uuid;
 v_request public.equipment_requests%rowtype;
 v_item public.equipment_items%rowtype;
 v_loan public.equipment_loans%rowtype;
 v_status text; v_title text;
begin
 if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active) then
  raise exception 'Compte actif requis' using errcode='42501';
 end if;
 select equipment_id into v_item_id from public.equipment_requests where id=p_request;
 select * into v_item from public.equipment_items where id=v_item_id for update;
 select * into v_request from public.equipment_requests where id=p_request for update;
 if v_item.id is null or v_request.id is null or v_request.equipment_id<>v_item.id then
  raise exception 'Demande indisponible' using errcode='42501';
 end if;
 if (p_action='cancel' and v_actor<>v_request.requester_id)
    or (p_action<>'cancel' and v_actor<>v_item.owner_id) then
  raise exception 'Action réservée au participant concerné' using errcode='42501';
 end if;
 if p_action not in ('accept','refuse','cancel','handover','return') or p_action is null then
  raise exception 'Action inconnue' using errcode='22023';
 end if;
 select * into v_loan from public.equipment_loans where request_id=p_request order by created_at desc limit 1 for update;
 if v_loan.id is not null and (v_loan.equipment_id<>v_item.id or v_loan.owner_id<>v_item.owner_id or v_loan.borrower_id<>v_request.requester_id) then
  raise exception 'Le prêt ne correspond pas à la demande' using errcode='42501';
 end if;
 -- Retries are harmless and do not send duplicate notifications.
 if (p_action='accept' and v_request.status='acceptee' and v_loan.status in ('reserve','en_cours'))
    or (p_action='refuse' and v_request.status='refusee')
    or (p_action='cancel' and v_request.status='annulee')
    or (p_action='handover' and v_loan.status='en_cours')
    or (p_action='return' and v_loan.status='retourne' and v_request.status='terminee') then return p_request; end if;
 if p_action in ('accept','refuse','cancel') then
  if v_request.status<>'en_attente' then raise exception 'Cette demande a déjà été traitée' using errcode='40001'; end if;
  if p_action='accept' then
   if v_item.status<>'disponible' or not v_item.is_available
      or exists(select 1 from public.equipment_loans where equipment_id=v_item.id and status in ('reserve','en_cours')) then
    raise exception 'Ce matériel est déjà réservé ou prêté' using errcode='40001';
   end if;
   if v_request.requested_start_date is null or v_request.requested_end_date is null or v_request.requested_end_date<v_request.requested_start_date then
    raise exception 'Dates de prêt invalides' using errcode='22023';
   end if;
   if not exists(select 1 from public.profiles where id=v_request.requester_id and status::text='active' and is_active)
      or exists(select 1 from public.user_blocks where (user_id=v_item.owner_id and target_user_id=v_request.requester_id) or (user_id=v_request.requester_id and target_user_id=v_item.owner_id)) then
    raise exception 'Cet échange n’est pas disponible' using errcode='42501';
   end if;
   insert into public.equipment_loans(equipment_id,owner_id,borrower_id,request_id,status)
    values(v_item.id,v_item.owner_id,v_request.requester_id,p_request,'reserve');
   update public.equipment_items set status='reserve',is_available=false,updated_at=now(),status_changed_at=now() where id=v_item.id;
   v_status:='acceptee'; v_title:='Demande de matériel acceptée';
  elsif p_action='refuse' then v_status:='refusee'; v_title:='Demande de matériel refusée';
  else v_status:='annulee'; v_title:='Demande de matériel annulée'; end if;
  update public.equipment_requests set status=v_status,updated_at=now() where id=p_request;
 elsif p_action='handover' then
  if v_request.status<>'acceptee' or v_loan.status is distinct from 'reserve' then raise exception 'Réservation requise avant la remise' using errcode='40001'; end if;
  update public.equipment_loans set status='en_cours',loan_started_at=now(),updated_at=now() where id=v_loan.id;
  update public.equipment_items set status='prete',is_available=false,updated_at=now(),status_changed_at=now() where id=v_item.id;
  v_title:='Remise du matériel confirmée';
 else
  if v_request.status<>'acceptee' or v_loan.status is distinct from 'en_cours' then raise exception 'Prêt en cours requis avant le retour' using errcode='40001'; end if;
  update public.equipment_loans set status='retourne',returned_at=now(),updated_at=now() where id=v_loan.id;
  update public.equipment_requests set status='terminee',updated_at=now() where id=p_request;
  update public.equipment_items set status='disponible',is_available=true,updated_at=now(),status_changed_at=now() where id=v_item.id;
  insert into public.trust_interactions(source_type,source_id,requester_id,receiver_id,interaction_type,status,review_unlocked,completed_at)
   values('equipment',v_item.id,v_request.requester_id,v_item.owner_id,'material_request','done',true,now())
   on conflict(source_type,source_id,requester_id) do update set status='done',review_unlocked=true,completed_at=now(),updated_at=now();
  v_title:='Retour du matériel confirmé';
 end if;
 insert into public.notifications(user_id,type,title,message,link)
  values(case when v_actor=v_item.owner_id then v_request.requester_id else v_item.owner_id end,
   'request_update',v_title,v_item.title,'/materiel/'||v_item.id::text);
 return p_request;
end;
$fn$;
revoke all on function bc_v2_private.equipment_action(uuid,text) from public,anon;
grant execute on function bc_v2_private.equipment_action(uuid,text) to authenticated;
create or replace function public.bc_v2_equipment_action(p_request uuid,p_action text)
returns uuid language sql security invoker set search_path='' as $fn$
 select bc_v2_private.equipment_action(p_request,p_action);
$fn$;
revoke all on function public.bc_v2_equipment_action(uuid,text) from public,anon;
grant execute on function public.bc_v2_equipment_action(uuid,text) to authenticated;

-- Public callers cannot patch protected profile columns. These decisions are
-- deliberately narrow, authenticated, audited, and atomic with notifications.
create or replace function bc_v2_private.admin_decision(p_target uuid,p_action text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_target public.profiles%rowtype;
 v_artisan public.artisan_profiles%rowtype; v_title text; v_new_status public.account_status;
begin
 if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and role::text='admin' and status::text='active' and is_active) then
  raise exception 'Action réservée à un administrateur actif' using errcode='42501';
 end if;
 if p_action is null or p_action not in ('activate','suspend','pending','approve_artisan','refuse_artisan') then
  raise exception 'Décision inconnue' using errcode='22023';
 end if;
 if char_length(coalesce(p_reason,''))>500 or (p_action<>'approve_artisan' and char_length(btrim(coalesce(p_reason,'')))<10) then
  raise exception 'Précisez un motif entre 10 et 500 caractères' using errcode='22023';
 end if;
 select * into v_target from public.profiles where id=p_target for update;
 if v_target.id is null or v_target.id=v_actor or v_target.role::text in ('admin','moderator') then
  raise exception 'Ce compte ne peut pas être modifié depuis cette action' using errcode='42501';
 end if;
 if p_action in ('approve_artisan','refuse_artisan') then
  if v_target.status::text not in ('active','pending') or not v_target.is_active then
   raise exception 'Réactivez le compte avant de décider sur son dossier' using errcode='22023';
  end if;
  select * into v_artisan from public.artisan_profiles where user_id=p_target for update;
  if v_artisan.id is null then raise exception 'Dossier artisan introuvable' using errcode='22023'; end if;
  if p_action='approve_artisan' and v_artisan.is_verified and v_target.role::text='artisan_verified' then return p_target; end if;
  if p_action='refuse_artisan' and not v_artisan.is_verified and v_target.role::text='resident' and v_artisan.rejection_reason=btrim(p_reason) then return p_target; end if;
  update public.profiles set role=case when p_action='approve_artisan' then 'artisan_verified'::public.user_role else 'resident'::public.user_role end,status='active' where id=p_target;
  update public.artisan_profiles set is_verified=(p_action='approve_artisan'),rejection_reason=case when p_action='refuse_artisan' then btrim(p_reason) else null end where id=v_artisan.id;
  v_title:=case when p_action='approve_artisan' then 'Votre profil artisan est validé' else 'Votre dossier artisan est à compléter' end;
 else
  v_new_status:=case when p_action='activate' then 'active'::public.account_status when p_action='suspend' then 'suspended'::public.account_status else 'pending'::public.account_status end;
  if v_target.status=v_new_status and v_target.is_active=(p_action<>'suspend') then return p_target; end if;
  update public.profiles set status=v_new_status,is_active=(p_action<>'suspend') where id=p_target;
  v_title:=case when p_action='activate' then 'Votre compte est actif' when p_action='suspend' then 'Votre compte est suspendu' else 'Votre compte est en attente' end;
 end if;
 insert into public.admin_action_logs(actor_id,actor_role,action,target_table,target_id,reason,meta)
  values(v_actor,'admin',p_action,'profiles',p_target::text,nullif(btrim(p_reason),''),jsonb_build_object('previous_role',v_target.role,'previous_status',v_target.status));
 insert into public.notifications(user_id,type,title,message,link)
  values(p_target,'account_update',v_title,coalesce(nullif(btrim(p_reason),''),'Votre dossier a été vérifié par l’administration.'),'/profil');
 return p_target;
end;
$fn$;
revoke all on function bc_v2_private.admin_decision(uuid,text,text) from public,anon;
grant execute on function bc_v2_private.admin_decision(uuid,text,text) to authenticated;
create or replace function public.bc_v2_admin_decision(p_target uuid,p_action text,p_reason text default null)
returns uuid language sql security invoker set search_path='' as $fn$
 select bc_v2_private.admin_decision(p_target,p_action,p_reason);
$fn$;
revoke all on function public.bc_v2_admin_decision(uuid,text,text) from public,anon;
grant execute on function public.bc_v2_admin_decision(uuid,text,text) to authenticated;

create or replace function bc_v2_private.admin_history()
returns setof public.admin_action_logs language plpgsql stable security definer set search_path='' as $fn$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role::text='admin' and status::text='active' and is_active) then
  raise exception 'Historique réservé à l’administration' using errcode='42501';
 end if;
 return query select * from public.admin_action_logs order by created_at desc,id desc limit 100;
end;
$fn$;
revoke all on function bc_v2_private.admin_history() from public,anon;
grant execute on function bc_v2_private.admin_history() to authenticated;
create or replace function public.bc_v2_admin_history()
returns setof public.admin_action_logs language sql security invoker set search_path='' as $fn$
 select * from bc_v2_private.admin_history();
$fn$;
revoke all on function public.bc_v2_admin_history() from public,anon;
grant execute on function public.bc_v2_admin_history() to authenticated;

notify pgrst,'reload schema';
