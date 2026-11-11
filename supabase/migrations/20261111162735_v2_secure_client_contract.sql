-- V2 additive contract. NOT APPLIED: database returned connection timeouts / 522.
-- Review and validate on a disposable database before applying to the shared project.
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

notify pgrst,'reload schema';
