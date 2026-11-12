-- Appointments for private service quotes. Existing records remain readable.
alter table public.appointments add column proposed_by uuid references public.profiles(id);
alter table public.appointments add column duration_minutes integer not null default 60 check(duration_minutes between 15 and 480);
-- Identity and decisions are validated by the RPCs; table reads retain RLS.
revoke insert,update,delete on public.appointments from public,anon,authenticated;

create or replace function bc_v2_private.propose_appointment(p_id uuid,p_request uuid,p_date date,p_time time,p_duration_minutes integer,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_request public.service_requests%rowtype;
 v_artisan public.artisan_profiles%rowtype; v_existing public.appointments%rowtype;
 v_start timestamptz; v_end timestamptz; v_recipient uuid;
begin
 if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active) then
  raise exception 'Compte actif requis' using errcode='42501'; end if;
 select * into v_request from public.service_requests where id=p_request for update;
 if v_request.id is null or v_request.artisan_id is null then raise exception 'Un devis adressé à un artisan est nécessaire' using errcode='42501'; end if;
 -- All bookings for this artisan use the same lock, including acceptance.
 select * into v_artisan from public.artisan_profiles where id=v_request.artisan_id for update;
 if v_artisan.id is null or v_actor not in (v_request.resident_id,v_artisan.user_id) or v_request.resident_id=v_artisan.user_id then
  raise exception 'Vous ne participez pas à ce devis' using errcode='42501'; end if;
 select * into v_existing from public.appointments where id=p_id;
 if v_existing.id is not null then
  if v_existing.request_id=p_request and v_existing.proposed_by=v_actor and v_existing.proposed_date=p_date
   and v_existing.proposed_time=p_time and v_existing.duration_minutes=p_duration_minutes and coalesce(v_existing.notes,'')=btrim(coalesce(p_notes,'')) then return p_id; end if;
  raise exception 'Cette proposition a déjà été utilisée' using errcode='22023';
 end if;
 if v_request.status::text in ('completed','cancelled') then raise exception 'Ce devis est clos' using errcode='22023'; end if;
 if not v_artisan.is_verified or not exists(select 1 from public.profiles where id=v_artisan.user_id and role::text='artisan_verified' and status::text='active' and is_active)
  or not exists(select 1 from public.profiles where id=v_request.resident_id and status::text='active' and is_active)
  or exists(select 1 from public.user_blocks where (user_id=v_request.resident_id and target_user_id=v_artisan.user_id) or (user_id=v_artisan.user_id and target_user_id=v_request.resident_id)) then
  raise exception 'Cet échange n’est pas disponible' using errcode='42501'; end if;
 if p_id is null or p_date is null or p_time is null or p_duration_minutes is null or p_duration_minutes not between 15 and 480 or char_length(coalesce(p_notes,''))>2000 then
  raise exception 'Proposition de rendez-vous invalide' using errcode='22023'; end if;
 v_start:=(p_date+p_time) at time zone 'Europe/Paris';
 if v_start<=now() or (v_start at time zone 'Europe/Paris')::time<>p_time then raise exception 'Choisissez une heure future valide en Corse' using errcode='22023'; end if;
 v_end:=v_start+make_interval(mins=>p_duration_minutes);
 if exists(select 1 from public.appointments where request_id=p_request and status::text in ('pending','accepted')) then
  raise exception 'Annulez la proposition actuelle avant de choisir un autre créneau' using errcode='40001'; end if;
 if exists(select 1 from public.appointments a where a.artisan_id=v_artisan.id and a.status::text='accepted'
   and ((a.proposed_date+a.proposed_time) at time zone 'Europe/Paris')<v_end
   and ((a.proposed_date+a.proposed_time) at time zone 'Europe/Paris')+make_interval(mins=>a.duration_minutes)>v_start) then
  raise exception 'L’artisan a déjà un rendez-vous sur ce créneau' using errcode='40001'; end if;
 insert into public.appointments(id,request_id,resident_id,artisan_id,proposed_date,proposed_time,duration_minutes,notes,proposed_by,status)
  values(p_id,p_request,v_request.resident_id,v_artisan.id,p_date,p_time,p_duration_minutes,nullif(btrim(p_notes),''),v_actor,'pending');
 v_recipient:=case when v_actor=v_request.resident_id then v_artisan.user_id else v_request.resident_id end;
 insert into public.notifications(user_id,type,title,message,link) values(v_recipient,'appointment_proposed','Une date vous est proposée',
  to_char(p_date,'DD/MM/YYYY')||' à '||to_char(p_time,'HH24:MI')||' — '||v_request.title,'/demandes/'||p_request::text);
 return p_id;
end;
$fn$;
revoke all on function bc_v2_private.propose_appointment(uuid,uuid,date,time,integer,text) from public,anon;
grant execute on function bc_v2_private.propose_appointment(uuid,uuid,date,time,integer,text) to authenticated;
create or replace function public.bc_v2_propose_appointment(p_id uuid,p_request uuid,p_date date,p_time time,p_duration_minutes integer,p_notes text default null)
returns uuid language sql security invoker set search_path='' as $fn$
 select bc_v2_private.propose_appointment(p_id,p_request,p_date,p_time,p_duration_minutes,p_notes);
$fn$;
revoke all on function public.bc_v2_propose_appointment(uuid,uuid,date,time,integer,text) from public,anon;
grant execute on function public.bc_v2_propose_appointment(uuid,uuid,date,time,integer,text) to authenticated;

create or replace function bc_v2_private.appointment_action(p_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid(); v_appointment public.appointments%rowtype; v_request public.service_requests%rowtype;
 v_artisan public.artisan_profiles%rowtype; v_request_id uuid; v_start timestamptz; v_recipient uuid;
 v_notify boolean:=true; v_title text;
begin
 if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active) then raise exception 'Compte actif requis' using errcode='42501'; end if;
 if p_action is null or p_action not in ('accept','decline','cancel','complete') then raise exception 'Décision de rendez-vous inconnue' using errcode='22023'; end if;
 select request_id into v_request_id from public.appointments where id=p_id;
 select * into v_request from public.service_requests where id=v_request_id for update;
 select * into v_artisan from public.artisan_profiles where id=v_request.artisan_id for update;
 select * into v_appointment from public.appointments where id=p_id for update;
 if v_request.id is null or v_artisan.id is null or v_appointment.id is null
  or v_appointment.request_id<>v_request.id or v_appointment.resident_id<>v_request.resident_id or v_appointment.artisan_id<>v_artisan.id
  or v_actor not in (v_request.resident_id,v_artisan.user_id) then raise exception 'Rendez-vous indisponible' using errcode='42501'; end if;
 if p_action in ('accept','decline') and (v_appointment.proposed_by is null or v_appointment.proposed_by=v_actor) then
  raise exception 'La décision appartient au destinataire de la proposition' using errcode='42501'; end if;
 if p_action='complete' and v_actor<>v_request.resident_id then raise exception 'Seul le résident peut confirmer la fin de l’intervention' using errcode='42501'; end if;
 if (p_action='accept' and v_appointment.status::text='accepted') or (p_action='decline' and v_appointment.status::text='declined')
  or (p_action='cancel' and v_appointment.status::text='cancelled') or (p_action='complete' and v_appointment.status::text='completed') then return p_id; end if;
 if v_request.status::text in ('completed','cancelled') then raise exception 'Ce devis est clos' using errcode='22023'; end if;
 if p_action='accept' then
  if v_appointment.status::text<>'pending' then raise exception 'Cette proposition a déjà été traitée' using errcode='40001'; end if;
  if not v_artisan.is_verified or not exists(select 1 from public.profiles where id=v_artisan.user_id and role::text='artisan_verified' and status::text='active' and is_active)
   or not exists(select 1 from public.profiles where id=v_request.resident_id and status::text='active' and is_active)
   or exists(select 1 from public.user_blocks where (user_id=v_request.resident_id and target_user_id=v_artisan.user_id) or (user_id=v_artisan.user_id and target_user_id=v_request.resident_id)) then
   raise exception 'Cet échange n’est pas disponible' using errcode='42501'; end if;
  v_start:=(v_appointment.proposed_date+v_appointment.proposed_time) at time zone 'Europe/Paris';
  if v_start<=now() then raise exception 'Cette date est passée : proposez un nouveau créneau' using errcode='22023'; end if;
  if exists(select 1 from public.appointments a where a.artisan_id=v_artisan.id and a.id<>p_id and a.status::text='accepted'
   and ((a.proposed_date+a.proposed_time) at time zone 'Europe/Paris')<v_start+make_interval(mins=>v_appointment.duration_minutes)
   and ((a.proposed_date+a.proposed_time) at time zone 'Europe/Paris')+make_interval(mins=>a.duration_minutes)>v_start) then
   raise exception 'Ce créneau vient d’être réservé : choisissez une autre date' using errcode='40001'; end if;
  update public.appointments set status='accepted',updated_at=now() where id=p_id;
  v_notify:=v_actor=v_request.resident_id or v_request.status::text='scheduled';
  update public.service_requests set status='scheduled',updated_at=now() where id=v_request.id;
  v_title:='Rendez-vous confirmé';
 elsif p_action='decline' then
  if v_appointment.status::text<>'pending' then raise exception 'Cette proposition a déjà été traitée' using errcode='40001'; end if;
  update public.appointments set status='declined',updated_at=now() where id=p_id;
  v_title:='Proposition de rendez-vous refusée';
 elsif p_action='cancel' then
  if v_appointment.status::text not in ('pending','accepted') then raise exception 'Ce rendez-vous ne peut plus être annulé' using errcode='40001'; end if;
  update public.appointments set status='cancelled',updated_at=now() where id=p_id;
  if v_request.status::text='scheduled' then
   update public.service_requests set status='replied',updated_at=now() where id=v_request.id;
   v_notify:=v_actor=v_request.resident_id;
  end if;
  v_title:='Rendez-vous annulé';
 else
  if v_appointment.status::text<>'accepted' then raise exception 'Un rendez-vous confirmé est nécessaire' using errcode='40001'; end if;
  update public.appointments set status='completed',updated_at=now() where id=p_id;
  update public.service_requests set status='completed',updated_at=now() where id=v_request.id;
  -- The existing completion trigger sends the notices and unlocks the review.
  v_notify:=false;
 end if;
 if v_notify then
  v_recipient:=case when v_actor=v_request.resident_id then v_artisan.user_id else v_request.resident_id end;
  insert into public.notifications(user_id,type,title,message,link) values(v_recipient,'appointment_update',v_title,v_request.title,'/demandes/'||v_request.id::text);
 end if;
 return p_id;
end;
$fn$;
revoke all on function bc_v2_private.appointment_action(uuid,text) from public,anon;
grant execute on function bc_v2_private.appointment_action(uuid,text) to authenticated;
create or replace function public.bc_v2_appointment_action(p_id uuid,p_action text)
returns uuid language sql security invoker set search_path='' as $fn$
 select bc_v2_private.appointment_action(p_id,p_action);
$fn$;
revoke all on function public.bc_v2_appointment_action(uuid,text) from public,anon;
grant execute on function public.bc_v2_appointment_action(uuid,text) to authenticated;

create or replace function bc_v2_private.sync_closed_quote_appointments()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.status is distinct from old.status and new.status::text in ('completed','cancelled') then
  update public.appointments set status=case when new.status::text='completed' and status::text='accepted' then 'completed'::public.appointment_status else 'cancelled'::public.appointment_status end,updated_at=now()
   where request_id=new.id and resident_id=new.resident_id and artisan_id=new.artisan_id and status::text in ('pending','accepted');
 end if;
 return new;
end;
$fn$;
revoke all on function bc_v2_private.sync_closed_quote_appointments() from public,anon,authenticated;
create trigger bc_v2_quote_appointments after update of status on public.service_requests
for each row execute function bc_v2_private.sync_closed_quote_appointments();
notify pgrst,'reload schema';
