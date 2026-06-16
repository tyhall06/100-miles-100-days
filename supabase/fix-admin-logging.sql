-- ============================================================================
-- fix-admin-logging.sql  —  Let logged-in admins log miles too
-- ============================================================================
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- Safe to re-run; idempotent. No redeploy needed — this is a database rule.
--
-- WHY: activity_logs only had an INSERT policy for the `anon` role. A normal
-- participant is anonymous, so logging works for them. But if you're signed in
-- to /admin, your browser's Supabase session is `authenticated`, and there was
-- no INSERT policy for that role — so the database silently rejected your log
-- entries (registration still worked because admins have full access to the
-- participants table; reads worked because everyone can read logs).
--
-- FIX: add a matching INSERT policy for authenticated users.
-- ============================================================================

drop policy if exists "logs_insert_authenticated" on activity_logs;
create policy "logs_insert_authenticated" on activity_logs
  for insert to authenticated with check (
    exists (select 1 from participants p where p.code = participant_code and p.banned = false)
  );

-- Verify (optional): should list logs_insert_anon, logs_insert_authenticated,
-- logs_select_all, logs_admin_delete
-- select policyname, cmd, roles from pg_policies where tablename = 'activity_logs';
