-- ============================================================================
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Fixes:
--   1. Adds security_invoker=on so views respect RLS on underlying tables
--   2. Excludes unregistered participants (no display_name) from leaderboard
--   3. Grants SELECT on views to anon + authenticated
-- ============================================================================

create or replace view leaderboard
  with (security_invoker = on) as
  select
    p.code,
    p.display_name,
    p.county,
    coalesce(sum(l.miles), 0)::numeric(10,2) as total_miles
  from participants p
  left join activity_logs l on l.participant_code = p.code
  where p.banned = false
    and p.display_name is not null   -- only show registered participants
  group by p.code
  order by total_miles desc;

create or replace view county_stats
  with (security_invoker = on) as
  select
    p.county,
    count(distinct p.code)::int as participants,
    coalesce(sum(l.miles), 0)::numeric(10,1) as total_miles,
    case when count(distinct p.code) > 0
         then (coalesce(sum(l.miles), 0) / count(distinct p.code))::numeric(10,1)
         else 0 end as avg_miles
  from participants p
  left join activity_logs l on l.participant_code = p.code
  where p.banned = false
    and p.county is not null
    and p.display_name is not null   -- only registered participants
  group by p.county
  order by total_miles desc;

create or replace view resource_stats
  with (security_invoker = on) as
  select
    c.resource_id,
    coalesce(c.resource_name, s.resource_name) as resource_name,
    coalesce(c.clicks, 0)::int as clicks,
    coalesce(s.session_count, 0)::int as session_count,
    coalesce(s.total_seconds, 0)::int as total_seconds,
    case when coalesce(s.session_count, 0) > 0
         then (s.total_seconds / s.session_count)::int
         else null end as avg_seconds
  from (
    select resource_id, max(resource_name) as resource_name, count(*) as clicks
    from resource_clicks group by resource_id
  ) c
  full outer join (
    select resource_id, max(resource_name) as resource_name,
           count(*) as session_count, sum(duration_seconds) as total_seconds
    from resource_sessions group by resource_id
  ) s on c.resource_id = s.resource_id;

grant select on leaderboard    to anon, authenticated;
grant select on county_stats   to anon, authenticated;
grant select on resource_stats to authenticated;

-- Done. Hard-refresh the live site (Ctrl+Shift+R) — leaderboard should load.
