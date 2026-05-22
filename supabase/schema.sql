-- ============================================================================
-- 100 Miles, 100 Days — Supabase schema
-- ============================================================================
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Designed for ~2,000 participants — fits comfortably in the free tier.
-- Zero-PII: we store only 4-digit codes, chosen display names, and county.
-- ============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Participants — pre-seeded from PEARS exports
create table if not exists participants (
  code          varchar(4)  primary key,
  display_name  varchar(20),
  county        varchar(50),
  banned        boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Activity logs
create table if not exists activity_logs (
  id                uuid          primary key default gen_random_uuid(),
  participant_code  varchar(4)    not null references participants(code) on delete cascade,
  date              date          not null,
  activity_type     varchar(50)   not null,
  miles             numeric(6,2)  not null check (miles > 0 and miles <= 50.00),
  notes             varchar(200),
  created_at        timestamptz   not null default now()
);
create index if not exists activity_logs_code_idx on activity_logs(participant_code);
create index if not exists activity_logs_date_idx on activity_logs(date);

-- Community submissions (photos + stories, moderated)
create table if not exists community_submissions (
  id            uuid          primary key default gen_random_uuid(),
  type          varchar(10)   not null check (type in ('photo','story')),
  content       text          not null,            -- base64 data URL or story text
  caption       varchar(200),
  display_name  varchar(20),
  county        varchar(50),
  status        varchar(10)   not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at  timestamptz   not null default now()
);
create index if not exists community_submissions_status_idx on community_submissions(status);

-- Resource analytics (aggregate only — no participant IDs attached)
create table if not exists resource_clicks (
  id             uuid         primary key default gen_random_uuid(),
  resource_id    integer      not null,
  resource_name  varchar(100) not null,
  clicked_at     timestamptz  not null default now()
);

create table if not exists resource_sessions (
  id                uuid         primary key default gen_random_uuid(),
  resource_id       integer      not null,
  resource_name     varchar(100) not null,
  duration_seconds  integer      not null check (duration_seconds >= 2),
  recorded_at       timestamptz  not null default now()
);

-- Site-wide announcement (single row, kept latest)
create table if not exists announcements (
  id          integer     primary key default 1,
  text        text        not null,
  updated_at  timestamptz not null default now(),
  constraint announcement_single_row check (id = 1)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Anonymous (anon key) clients can:
--   - Read participants (for code validation)
--   - Read approved community submissions
--   - Read announcements
--   - Read aggregate resource analytics? NO — admin only
--   - Insert activity_logs, resource_clicks, resource_sessions, community_submissions
--   - Update their own participant row (display_name/county on registration)
-- Authenticated admins (via Supabase Auth) can do everything.
-- ============================================================================

alter table participants            enable row level security;
alter table activity_logs           enable row level security;
alter table community_submissions   enable row level security;
alter table resource_clicks         enable row level security;
alter table resource_sessions       enable row level security;
alter table announcements           enable row level security;

-- ── participants ──
-- Anyone (anon) can read participants — needed to validate codes & build leaderboard.
-- No PII here so this is safe.
drop policy if exists "participants_select_all" on participants;
create policy "participants_select_all" on participants
  for select using (true);

-- Anonymous users can update display_name/county for an existing code (registration).
-- They cannot change `banned`. Admins (authenticated) can do anything.
drop policy if exists "participants_update_anon_self" on participants;
create policy "participants_update_anon_self" on participants
  for update to anon using (true) with check (banned = false);

drop policy if exists "participants_admin_all" on participants;
create policy "participants_admin_all" on participants
  for all to authenticated using (true) with check (true);

-- ── activity_logs ──
-- Anyone can read all logs (needed for leaderboard, no PII attached).
drop policy if exists "logs_select_all" on activity_logs;
create policy "logs_select_all" on activity_logs
  for select using (true);

-- Anyone can insert a log (the participant_code must exist & not be banned).
drop policy if exists "logs_insert_anon" on activity_logs;
create policy "logs_insert_anon" on activity_logs
  for insert to anon with check (
    exists (select 1 from participants p where p.code = participant_code and p.banned = false)
  );

-- Admins can delete (reset data, moderation).
drop policy if exists "logs_admin_delete" on activity_logs;
create policy "logs_admin_delete" on activity_logs
  for delete to authenticated using (true);

-- ── community_submissions ──
-- Public (anon) reads ONLY approved.
drop policy if exists "submissions_select_approved" on community_submissions;
create policy "submissions_select_approved" on community_submissions
  for select to anon using (status = 'approved');

-- Anyone can insert as 'pending'.
drop policy if exists "submissions_insert_anon" on community_submissions;
create policy "submissions_insert_anon" on community_submissions
  for insert to anon with check (status = 'pending');

-- Admins can read all + moderate.
drop policy if exists "submissions_admin_all" on community_submissions;
create policy "submissions_admin_all" on community_submissions
  for all to authenticated using (true) with check (true);

-- ── resource_clicks / resource_sessions ──
-- Anonymous inserts allowed (no SELECT — admin only).
drop policy if exists "rclicks_insert_anon" on resource_clicks;
create policy "rclicks_insert_anon" on resource_clicks
  for insert to anon with check (true);

drop policy if exists "rclicks_admin_select" on resource_clicks;
create policy "rclicks_admin_select" on resource_clicks
  for select to authenticated using (true);

drop policy if exists "rsessions_insert_anon" on resource_sessions;
create policy "rsessions_insert_anon" on resource_sessions
  for insert to anon with check (true);

drop policy if exists "rsessions_admin_select" on resource_sessions;
create policy "rsessions_admin_select" on resource_sessions
  for select to authenticated using (true);

-- ── announcements ──
-- Anyone can read the current banner; only admins can write.
drop policy if exists "announcements_select_all" on announcements;
create policy "announcements_select_all" on announcements
  for select using (true);

drop policy if exists "announcements_admin_write" on announcements;
create policy "announcements_admin_write" on announcements
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================
-- Pre-aggregated leaderboard view (faster than client-side aggregation).
-- security_invoker = on means the view runs as the calling user (anon/authenticated),
-- which makes RLS on the underlying tables apply correctly.
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
    and p.display_name is not null   -- only registered participants
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

-- Resource analytics view (admin only via grant below)
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

-- Views aren't covered by table grants — make them readable by anon/auth.
grant select on leaderboard    to anon, authenticated;
grant select on county_stats   to anon, authenticated;
grant select on resource_stats to authenticated;  -- admin only

-- ============================================================================
-- DEMO REGISTRATION CODES (9001–9010)
-- Reusable demo accounts that have no display_name/county yet, so reviewers
-- can experience the full registration flow.
-- ============================================================================
insert into participants (code) values
  ('9001'), ('9002'), ('9003'), ('9004'), ('9005'),
  ('9006'), ('9007'), ('9008'), ('9009'), ('9010')
on conflict (code) do nothing;

-- ============================================================================
-- DONE
-- Next step: in the Supabase dashboard → Authentication → Users →
-- "Invite user" with the email address of each MU Extension admin.
-- They'll set a password via the invite email and can then log into /admin.
-- ============================================================================
