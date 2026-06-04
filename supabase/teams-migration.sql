-- ============================================================================
-- 100 Miles, 100 Days — TEAMS feature migration
-- ============================================================================
-- Run this in the Supabase SQL Editor AFTER schema.sql is already applied.
-- It is idempotent (safe to run more than once).
--
-- What it adds:
--   • teams table (id, name, created_at)
--   • participants.team_id column (NULL = "flying solo")
--   • RLS policies (anon can read teams + create a team during registration;
--     admins can do anything)
--   • team_leaderboard view (total + average miles per team)
-- ============================================================================

-- ── teams table ────────────────────────────────────────────────────────────
create table if not exists teams (
  id          uuid         primary key default gen_random_uuid(),
  name        varchar(40)  not null,
  created_at  timestamptz  not null default now()
);

-- Case-insensitive uniqueness: "Trailblazers" and "trailblazers" collide.
create unique index if not exists teams_name_lower_idx on teams (lower(name));

-- ── participants.team_id ─────────────────────────────────────────────────────
alter table participants
  add column if not exists team_id uuid references teams(id) on delete set null;

create index if not exists participants_team_idx on participants(team_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table teams enable row level security;

-- Anyone can read the team list (needed for the registration search + leaderboard).
drop policy if exists "teams_select_all" on teams;
create policy "teams_select_all" on teams
  for select using (true);

-- Anonymous users can create a team during registration, with guardrails:
-- name must be 2–40 characters after trimming.
drop policy if exists "teams_insert_anon" on teams;
create policy "teams_insert_anon" on teams
  for insert to anon
  with check (char_length(btrim(name)) between 2 and 40);

-- Admins (authenticated) can rename / delete / merge.
drop policy if exists "teams_admin_all" on teams;
create policy "teams_admin_all" on teams
  for all to authenticated using (true) with check (true);

-- NOTE: participants already has an anon UPDATE policy
-- ("participants_update_anon_self": for update to anon using (true)
--  with check (banned = false)). That policy already allows a registrant
-- to set their own team_id, so no new participant policy is required.

-- ============================================================================
-- TEAM LEADERBOARD VIEW
-- ============================================================================
-- Total + average miles per team. Only counts registered, non-banned members.
-- security_invoker = on so RLS on the base tables applies to the caller.
create or replace view team_leaderboard
  with (security_invoker = on) as
  select
    t.id                                          as team_id,
    t.name                                        as team_name,
    count(distinct p.code)::int                   as members,
    coalesce(sum(l.miles), 0)::numeric(10,1)      as total_miles,
    case when count(distinct p.code) > 0
         then (coalesce(sum(l.miles), 0) / count(distinct p.code))::numeric(10,1)
         else 0 end                               as avg_miles
  from teams t
  join participants p
    on p.team_id = t.id
   and p.banned = false
   and p.display_name is not null
  left join activity_logs l on l.participant_code = p.code
  group by t.id, t.name
  order by total_miles desc;

grant select on team_leaderboard to anon, authenticated;

-- Directory used by the registration "create or join a team" step: EVERY team
-- (including brand-new empty ones) with its registered-member count.
create or replace view team_directory
  with (security_invoker = on) as
  select
    t.id,
    t.name,
    count(p.code) filter (
      where p.display_name is not null and p.banned = false
    )::int as members
  from teams t
  left join participants p on p.team_id = t.id
  group by t.id, t.name
  order by lower(t.name);

grant select on team_directory to anon, authenticated;

-- Convenience view for admins: every team with its member count, including
-- teams that currently have zero registered members (handy for cleanup).
create or replace view team_admin
  with (security_invoker = on) as
  select
    t.id,
    t.name,
    t.created_at,
    count(p.code)::int as members
  from teams t
  left join participants p on p.team_id = t.id
  group by t.id, t.name, t.created_at
  order by t.name;

grant select on team_admin to authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
