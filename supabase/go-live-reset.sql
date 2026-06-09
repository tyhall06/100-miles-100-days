-- ============================================================================
-- go-live-reset.sql  —  Wipe all TEST data before launch
-- ============================================================================
-- ⚠️  DESTRUCTIVE. This permanently deletes every logged mile, community
--     submission, analytics row, team, and participant currently in the
--     database. Run it ONCE, right before you import the real participant
--     codes and open the site to the public.
--
-- It does NOT touch the table structure, RLS policies, or views — only the rows.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this file → Run.
--
-- RECOMMENDED LAUNCH ORDER:
--   1. (if not done) run teams-migration.sql  and  harden-rls.sql
--   2. run THIS file to clear test data
--   3. import supabase-codes.csv into the participants table  (real codes)
--   4. Authentication → Users → invite each admin
-- ============================================================================

begin;

-- Engagement / activity data (test logs, photos, stories, click analytics)
delete from activity_logs;
delete from community_submissions;
delete from resource_clicks;
delete from resource_sessions;
delete from announcements;          -- remove this line if you want to keep any banner you've set

-- Participants + teams.
-- Deleting participants cascades to any remaining activity_logs automatically.
delete from participants;           -- removes test registrations AND the demo codes 9001–9010
delete from teams;                  -- removes test teams

commit;

-- ── OPTIONAL: re-seed the demo codes for staff QA on the live site ──
-- Leave commented out for a clean public launch (these codes let anyone
-- register a throwaway entry that shows on the public leaderboard).
-- Uncomment only if your team still wants reviewer accounts after launch.
--
-- insert into participants (code) values
--   ('9001'), ('9002'), ('9003'), ('9004'), ('9005'),
--   ('9006'), ('9007'), ('9008'), ('9009'), ('9010')
-- on conflict (code) do nothing;

-- Verify it's empty (optional):
-- select
--   (select count(*) from participants)         as participants,
--   (select count(*) from activity_logs)        as logs,
--   (select count(*) from community_submissions) as submissions,
--   (select count(*) from teams)                as teams;
