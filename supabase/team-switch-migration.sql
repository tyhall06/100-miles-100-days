-- ============================================================================
-- team-switch-migration.sql  —  Allow participants ONE self-service team switch
-- ============================================================================
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- Safe to re-run; idempotent. No redeploy needed for the DB part.
--
-- Adds a `team_changed` flag. Solo participants can join a team freely; once on
-- a team they get exactly one self-service switch (which sets team_changed=true
-- and locks further self-switching). Admins can still reassign anyone anytime
-- (and can clear the flag to grant another switch — see bottom).
-- ============================================================================

alter table participants
  add column if not exists team_changed boolean not null default false;

-- Extend anon's allowed UPDATE columns to include team_changed so the one-time
-- switch can set it. (Mirrors harden-rls.sql; anon still can't touch `banned`.)
grant update (display_name, county, team_id, team_changed) on participants to anon;

-- ── To give a specific person another switch (admin), clear their flag: ──
-- update participants set team_changed = false where code = '1234';
