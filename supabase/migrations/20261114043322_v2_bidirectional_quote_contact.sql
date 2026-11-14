-- Either private-quote participant may initiate the same contextual exchange.
create or replace function bc_v2_private.start_conversation(
  p_recipient uuid, p_type text, p_record uuid, p_subject text,
  p_content text, p_message_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor uuid := auth.uid();
  v_conversation uuid;
  v_allowed boolean := false;
  v_source_owner uuid := p_recipient;
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
      -- Lock the request before the canonical conversation lock. Closure and
      -- two-way first contact then share one consistent transaction order.
      select true,r.resident_id into v_allowed,v_source_owner from public.service_requests r
        left join public.artisan_profiles a on a.id=r.artisan_id
        where r.id=p_record and r.status::text not in ('completed','cancelled')
        and ((r.artisan_id is null and r.resident_id=p_recipient)
          or (r.artisan_id is not null and
            ((r.resident_id=v_actor and a.user_id=p_recipient)
              or (r.resident_id=p_recipient and a.user_id=v_actor))))
        for update of r;
      v_allowed:=coalesce(v_allowed,false);
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
      values (btrim(p_subject),p_type::public.related_type,p_record,v_actor,v_source_owner,btrim(p_subject)) returning id into v_conversation;
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
notify pgrst,'reload schema';

-- A private quote must never become a public request through ON DELETE SET NULL.
create or replace function bc_v2_private.keep_private_quote_owner()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if exists(select 1 from public.service_requests where artisan_id=old.id) then
  raise exception 'Ce profil est lié à des devis privés et ne peut pas être supprimé. Contactez l’administration pour sa désactivation.' using errcode='42501';
 end if;
 return old;
end;
$fn$;
revoke all on function bc_v2_private.keep_private_quote_owner() from public,anon,authenticated;
create trigger bc_v2_keep_private_quote_owner before delete on public.artisan_profiles
for each row execute function bc_v2_private.keep_private_quote_owner();
