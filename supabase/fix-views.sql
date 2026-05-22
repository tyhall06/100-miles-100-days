-- ============================================================================
-- HOTFIX — run this once in the Supabase SQL editor to fix the Leaderboard
-- blanking bug. Safe to re-run.
-- ============================================================================

-- Recreate the views with security_invoker so they respect the RLS policies
-- of the underlying tables (which already allow anon SELECT).
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
  where p.banned = false and p.county is not null
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

-- Grant SELECT on the views to anon + authenticated.
-- (Views are not automatically granted, only tables are.)
grant select on leaderboard      to anon, authenticated;
grant select on county_stats     to anon, authenticated;
grant select on resource_stats   to authenticated;  -- admin only

-- Done. Refresh your site — leaderboard should load.
