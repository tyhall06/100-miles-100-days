-- ============================================================================
-- admin-log-edit-migration.sql  —  Let admins edit activity logs (date / miles)
-- ============================================================================
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- Safe to re-run; idempotent. No redeploy needed for the DB part.
--
-- Deleting logs is already allowed for admins (logs_admin_delete). This adds the
-- matching UPDATE policy so the admin panel's "Fix Participant Logs" tool can
-- correct a wrong date or mileage. Applies ONLY to the authenticated (admin)
-- role — anonymous participants still can't edit or delete logs.
-- ============================================================================

drop policy if exists "logs_admin_update" on activity_logs;
create policy "logs_admin_update" on activity_logs
  for update to authenticated using (true) with check (true);
