-- ============================================================================
-- dedupe-activity-logs.sql  —  Remove accidental double-submitted log entries
-- ============================================================================
-- Run in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
--
-- WHAT IT DOES: when the same participant has multiple IDENTICAL logs
-- (same code + date + activity + miles) created within 60 seconds of each
-- other, it keeps the earliest and deletes the rest. That's the signature of a
-- double-tap on the submit button (e.g. code 3588's 5×5 mi = 25 mi).
--
-- WHAT IT WON'T TOUCH: two legitimately separate logs of the same value on the
-- same day that are more than 60 seconds apart are preserved.
--
-- TIP: run the SELECT first to preview exactly what will be deleted, then the
-- DELETE. Safe to re-run.
-- ============================================================================

-- Preview what would be deleted:
-- select a.participant_code, a.date, a.activity_type, a.miles, a.created_at
-- from activity_logs a
-- using activity_logs b           -- (remove this line if your client dislikes USING in SELECT; see join form below)
-- ;

-- Preview (join form):
-- select a.participant_code, a.date, a.activity_type, a.miles, a.created_at
-- from activity_logs a
-- join activity_logs b
--   on a.participant_code = b.participant_code
--  and a.date = b.date
--  and a.activity_type = b.activity_type
--  and a.miles = b.miles
--  and a.created_at > b.created_at
--  and a.created_at - b.created_at < interval '60 seconds'
-- order by a.participant_code, a.created_at;

-- Delete the duplicates (keeps the earliest in each rapid-fire group):
delete from activity_logs a
using activity_logs b
where a.participant_code = b.participant_code
  and a.date           = b.date
  and a.activity_type  = b.activity_type
  and a.miles          = b.miles
  and a.created_at     > b.created_at
  and a.created_at - b.created_at < interval '60 seconds';
