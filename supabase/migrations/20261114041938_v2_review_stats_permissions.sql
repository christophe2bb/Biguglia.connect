-- Recompute aggregates as a private trigger, never by granting client writes.
-- Zero visible reviews must produce zero counts/average, not NOT NULL failures.
create or replace function bc_v2_private.recalculate_review_stats()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_profile uuid; v_profiles uuid[];
begin
 if tg_op='INSERT' then v_profiles:=array[new.target_user_id];
 elsif tg_op='DELETE' then v_profiles:=array[old.target_user_id];
 else v_profiles:=array[old.target_user_id,new.target_user_id]; end if;
 -- Stable lock order for edits that move a legacy review between targets.
 for v_profile in select distinct p from unnest(v_profiles) p where p is not null order by p loop
  perform pg_advisory_xact_lock(hashtextextended('bc_v2_review_stats:'||v_profile::text,0));
 end loop;
 for v_profile in select distinct p from unnest(v_profiles) p where p is not null order by p loop
  insert into public.trust_profile_stats(
   profile_id,reviews_received,avg_rating,avg_communication,avg_reliability,avg_punctuality,avg_quality,recommend_pct,
   dist_1,dist_2,dist_3,dist_4,dist_5,trust_score,last_computed_at
  )
  select v_profile,count(*),coalesce(round(avg(rating)::numeric,2),0),
   round(avg(dim_communication)::numeric,2),round(avg(dim_reliability)::numeric,2),round(avg(dim_punctuality)::numeric,2),round(avg(dim_quality)::numeric,2),
   case when count(*)>0 then round(100.0*sum(case when would_recommend then 1 else 0 end)/count(*))::integer else null end,
   count(*) filter(where rating=1),count(*) filter(where rating=2),count(*) filter(where rating=3),count(*) filter(where rating=4),count(*) filter(where rating=5),
   least(100,20+least(30,count(*)*3)+case when avg(rating)>=4.5 then 30 when avg(rating)>=4.0 then 20 when avg(rating)>=3.0 then 10 else 0 end)::integer,now()
  from public.reviews where target_user_id=v_profile and moderation_status='visible'
  on conflict(profile_id) do update set
   reviews_received=excluded.reviews_received,avg_rating=excluded.avg_rating,
   avg_communication=excluded.avg_communication,avg_reliability=excluded.avg_reliability,
   avg_punctuality=excluded.avg_punctuality,avg_quality=excluded.avg_quality,recommend_pct=excluded.recommend_pct,
   dist_1=excluded.dist_1,dist_2=excluded.dist_2,dist_3=excluded.dist_3,dist_4=excluded.dist_4,dist_5=excluded.dist_5,
   trust_score=excluded.trust_score,last_computed_at=now(),updated_at=now();
 end loop;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$fn$;
revoke all on function bc_v2_private.recalculate_review_stats() from public,anon,authenticated;
drop trigger if exists trg_recalc_trust on public.reviews;
create trigger trg_recalc_trust after insert or update or delete on public.reviews
for each row execute function bc_v2_private.recalculate_review_stats();
-- The previous trigger function is retained for migration provenance only.
revoke all on function public.recalc_trust_stats() from public,anon,authenticated;
