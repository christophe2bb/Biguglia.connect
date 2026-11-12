-- V2 additive contract, verified against the live schema and a disposable PostgreSQL fixture.
-- Application state is recorded in the hosted migration history and V2 reconstruction notes.
-- Existing application functions and records are retained.
create schema if not exists bc_v2_private;
revoke all on schema bc_v2_private from public, anon;
grant usage on schema bc_v2_private to authenticated;

create or replace function bc_v2_private.start_conversation(
  p_recipient uuid, p_type text, p_record uuid, p_subject text,
  p_content text, p_message_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor uuid := auth.uid();
  v_conversation uuid;
  v_allowed boolean := false;
begin
  if v_actor is null or p_recipient is null or p_recipient = v_actor then
    raise exception 'Connexion ou destinataire invalide' using errcode = '42501';
  end if;
  if not exists(select 1 from public.profiles where id=v_actor and status::text='active' and is_active)
     or not exists(select 1 from public.profiles where id=p_recipient and status::text='active' and is_active) then
    raise exception 'Ce compte ne peut pas commencer cet échange' using errcode = '42501';
  end if;
  if exists(select 1 from public.user_blocks where (user_id=v_actor and target_user_id=p_recipient) or (user_id=p_recipient and target_user_id=v_actor)) then
    raise exception 'Cet échange n’est pas disponible' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_content,''))) not between 1 and 5000
     or char_length(btrim(coalesce(p_subject,''))) not between 1 and 200
     or p_message_id is null then
    raise exception 'Message invalide' using errcode='22023';
  end if;
  case p_type
    when 'artisan' then select exists(select 1 from public.artisan_profiles where id=p_record and user_id=p_recipient and is_verified) into v_allowed;
    when 'service_request' then
      select exists(select 1 from public.service_requests r left join public.artisan_profiles a on a.id=r.artisan_id
        where r.id=p_record and r.resident_id=p_recipient and r.status::text not in ('completed','cancelled')
        and (r.artisan_id is null or a.user_id=v_actor)) into v_allowed;
    when 'listing' then select exists(select 1 from public.listings where id=p_record and user_id=p_recipient and status::text='active') into v_allowed;
    when 'equipment' then select exists(select 1 from public.equipment_items where id=p_record and owner_id=p_recipient and status not in ('archive','indisponible')) into v_allowed;
    when 'help_request' then select exists(select 1 from public.help_requests where id=p_record and author_id=p_recipient) into v_allowed;
    when 'association' then select exists(select 1 from public.associations where id=p_record and author_id=p_recipient and status='active') into v_allowed;
    when 'collection_item' then select exists(select 1 from public.collection_items where id=p_record and author_id=p_recipient and status in ('actif','active')) into v_allowed;
    when 'outing' then select exists(select 1 from public.group_outings where id=p_record and organizer_id=p_recipient and status not in ('annulee','archivee')) into v_allowed;
    when 'event' then select exists(select 1 from public.events where id=p_record and author_id=p_recipient and status not in ('annule','archive')) into v_allowed;
    when 'lost_found' then select exists(select 1 from public.lost_found_items where id=p_record and author_id=p_recipient) into v_allowed;
    when 'general' then v_allowed := true;
    else raise exception 'Contexte de conversation invalide' using errcode='22023';
  end case;
  if not v_allowed then raise exception 'Publication indisponible' using errcode='42501'; end if;

  -- Same participants + same source => one conversation, even on concurrent taps.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(v_actor,p_recipient)::text || ':' || greatest(v_actor,p_recipient)::text || ':' || p_type || ':' || coalesce(p_record::text,''), 0));
  select c.id into v_conversation from public.conversations c
    join public.conversation_participants a on a.conversation_id=c.id and a.user_id=v_actor
    join public.conversation_participants b on b.conversation_id=c.id and b.user_id=p_recipient
    where c.related_type::text=p_type and c.related_id is not distinct from p_record
    order by c.created_at limit 1;
  if v_conversation is null then
    insert into public.conversations(subject,related_type,related_id,created_by,owner_id,source_title)
      values (btrim(p_subject),p_type::public.related_type,p_record,v_actor,p_recipient,btrim(p_subject)) returning id into v_conversation;
    insert into public.conversation_participants(conversation_id,user_id)
      values(v_conversation,v_actor),(v_conversation,p_recipient);
  end if;
  if exists(select 1 from public.messages where id=p_message_id and (sender_id<>v_actor or conversation_id<>v_conversation or content<>btrim(p_content))) then
    raise exception 'Identifiant de message déjà utilisé' using errcode='22023';
  end if;
  insert into public.messages(id,conversation_id,sender_id,content)
    values(p_message_id,v_conversation,v_actor,btrim(p_content)) on conflict(id) do nothing;
  return v_conversation;
end;
$fn$;
revoke all on function bc_v2_private.start_conversation(uuid,text,uuid,text,text,uuid) from public,anon;
grant execute on function bc_v2_private.start_conversation(uuid,text,uuid,text,text,uuid) to authenticated;
create or replace function public.bc_v2_start_conversation(p_recipient uuid,p_type text,p_record uuid,p_subject text,p_content text,p_message_id uuid)
returns uuid language sql security invoker set search_path='' as $fn$
  select bc_v2_private.start_conversation(p_recipient,p_type,p_record,p_subject,p_content,p_message_id);
$fn$;
revoke all on function public.bc_v2_start_conversation(uuid,text,uuid,text,text,uuid) from public,anon;
grant execute on function public.bc_v2_start_conversation(uuid,text,uuid,text,text,uuid) to authenticated;

-- Direct image uploads use the caller's personal prefix. Record-table RLS still
-- governs attaching a photo to a publication. No secret key is sent to the app.
create policy bc_v2_own_photo_insert on storage.objects for insert to authenticated
with check(bucket_id='photos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp'));
create policy bc_v2_own_photo_delete on storage.objects for delete to authenticated
using(bucket_id='photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Private service-request photos retain their existing requests/<id>/ prefix.
create or replace function bc_v2_private.can_access_quote(p_path text,p_write boolean)
returns boolean language plpgsql stable security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid(); v_request uuid;
begin
  if v_actor is null or split_part(p_path,'/',1)<>'requests' or split_part(p_path,'/',2)!~'^[0-9a-fA-F-]{36}$' then return false; end if;
  v_request:=split_part(p_path,'/',2)::uuid;
  return exists(select 1 from public.service_requests r left join public.artisan_profiles a on a.id=r.artisan_id
    where r.id=v_request and r.artisan_id is not null and
    (r.resident_id=v_actor or (not p_write and a.user_id=v_actor)));
exception when invalid_text_representation then return false;
end;
$fn$;
revoke all on function bc_v2_private.can_access_quote(text,boolean) from public,anon;
grant execute on function bc_v2_private.can_access_quote(text,boolean) to authenticated;
create policy bc_v2_quote_read on storage.objects for select to authenticated
using(bucket_id='service-quote-photos' and bc_v2_private.can_access_quote(name,false));
create policy bc_v2_quote_insert on storage.objects for insert to authenticated
with check(bucket_id='service-quote-photos' and bc_v2_private.can_access_quote(name,true)
  and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp'));

-- The live schema had no guard against self-promotion through profiles UPDATE.
-- Identity and moderation fields must be enforced in the database, not the UI.
create or replace function bc_v2_private.guard_profile_identity()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid(); v_role text;
begin
  if v_actor is null and (session_user in ('postgres','supabase_admin') or auth.jwt()->>'role'='service_role') then return new; end if;
  select p.role::text into v_role from public.profiles p where p.id=v_actor;
  if tg_op='INSERT' then
    if new.role::text not in ('resident','artisan_pending') or new.status::text not in ('active','pending') or not new.is_active then
      raise exception 'Création de rôle privilégié interdite' using errcode='42501';
    end if;
  else
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'Identité protégée' using errcode='42501';
    end if;
    if new.role is distinct from old.role and v_role is distinct from 'admin' then
      raise exception 'Modification du rôle réservée à l’administration' using errcode='42501';
    end if;
    if (new.status is distinct from old.status or new.is_active is distinct from old.is_active)
       and coalesce(v_role,'') not in ('admin','moderator') then
      raise exception 'État du compte protégé' using errcode='42501';
    end if;
  end if;
  return new;
end;
$fn$;
revoke all on function bc_v2_private.guard_profile_identity() from public,anon,authenticated;
create trigger bc_v2_profiles_identity before insert or update on public.profiles
for each row execute function bc_v2_private.guard_profile_identity();

create or replace function bc_v2_private.account_enabled()
returns boolean language sql stable security definer set search_path='' as $fn$
 select auth.uid() is not null and not exists(
   select 1 from public.profiles where id=auth.uid() and (status::text='suspended' or not is_active)
 );
$fn$;
revoke all on function bc_v2_private.account_enabled() from public,anon;
grant execute on function bc_v2_private.account_enabled() to authenticated;
-- Restrictive policies add a suspension gate to existing ownership policies.
-- They never grant row access by themselves. Missing profiles can still be
-- created through the existing self-insert policy and the identity guard above.
do $block$
declare t record;
begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity
 loop
   execute format('create policy bc_v2_account_enabled on public.%I as restrictive for all to authenticated using ((select bc_v2_private.account_enabled())) with check ((select bc_v2_private.account_enabled()))',t.relname);
 end loop;
end;
$block$;

create or replace function bc_v2_private.guard_message_identity()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null and (session_user in ('postgres','supabase_admin') or auth.jwt()->>'role'='service_role') then return new; end if;
 if v_actor is null or new.sender_id<>v_actor or not bc_v2_private.account_enabled() then
   raise exception 'Identité de message invalide' using errcode='42501';
 end if;
 if exists(select 1 from public.conversation_participants cp join public.user_blocks b on
    ((b.user_id=v_actor and b.target_user_id=cp.user_id) or (b.user_id=cp.user_id and b.target_user_id=v_actor))
    where cp.conversation_id=new.conversation_id) then
   raise exception 'Cet échange n’est pas disponible' using errcode='42501';
 end if;
 return new;
end;
$fn$;
revoke all on function bc_v2_private.guard_message_identity() from public,anon,authenticated;
create trigger bc_v2_messages_identity before insert on public.messages
for each row execute function bc_v2_private.guard_message_identity();

revoke update on public.conversation_participants from public,anon,authenticated;
grant update(last_read_at) on public.conversation_participants to authenticated;
create policy bc_v2_read_receipt on public.conversation_participants for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

notify pgrst,'reload schema';
