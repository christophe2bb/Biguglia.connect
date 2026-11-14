-- Move only the current participant's marker, through an actually readable
-- message. GREATEST prevents a slow client from moving it backwards.
create or replace function public.bc_v2_mark_conversation_read(p_conversation uuid,p_message uuid)
returns timestamptz language sql security invoker set search_path='' as $fn$
 update public.conversation_participants cp
 set last_read_at=greatest(coalesce(cp.last_read_at,'-infinity'::timestamptz),least(m.created_at,statement_timestamp()))
 from public.messages m
 where cp.conversation_id=p_conversation and cp.user_id=(select auth.uid())
   and m.id=p_message and m.conversation_id=cp.conversation_id
 returning cp.last_read_at;
$fn$;
revoke all on function public.bc_v2_mark_conversation_read(uuid,uuid) from public,anon;
grant execute on function public.bc_v2_mark_conversation_read(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
