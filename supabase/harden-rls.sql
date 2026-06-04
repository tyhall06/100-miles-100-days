-- ============================================================================
-- harden-rls.sql  —  RLS column-level hardening for participants
-- ============================================================================
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- Safe to re-run; idempotent.
--
-- WHY: the existing anon UPDATE policy is `using (true) with check (banned = false)`.
-- The check only validates the NEW row, so the public anon key (embedded in the
-- browser bundle by design) could call the REST API and set `banned = false` on a
-- banned row — i.e. a banned participant could unban themselves.
--
-- FIX: Postgres RLS gates which *rows* you can touch; column privileges gate which
-- *columns*. We revoke blanket UPDATE from anon and grant UPDATE on only the three
-- columns registration actually needs. After this, anon physically cannot write to
-- `banned` or `code` at all — the unban path is closed.
-- ============================================================================

revoke update on participants from anon;
grant update (display_name, county, team_id) on participants to anon;

-- Verify (optional): should list only display_name, county, team_id for grantee 'anon'
-- select column_name, privilege_type
-- from information_schema.column_privileges
-- where table_name = 'participants' and grantee = 'anon';
