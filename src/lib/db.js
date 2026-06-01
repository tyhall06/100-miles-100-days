// ===========================================================================
// db.js — unified async data layer
// ===========================================================================
// All shared/persistent data flows through here. Two modes:
//
//   PROD  (Supabase env vars set): hits Supabase
//   DEV   (env vars unset):        hits localStorage + mockData
//
// Pages call `await db.xxx()` — they don't know or care which mode is active.
// Personal session state (current code, name, county, language) stays in
// localStorage in both modes — that's a per-device concern.
// ===========================================================================

import { supabase, HAS_SUPABASE } from './supabase'
import {
  mockParticipants, mockActivityLogs,
  DEMO_REGISTRATION_CODES, getLogsForCode, getLeaderboard as mockLeaderboard,
  getCountyStats as mockCountyStats, getStatsStatewide as mockStatewide,
  getTotalMilesForCode,
} from './mockData'
import {
  getSubmissions, saveSubmission as localSaveSubmission,
  updateSubmissionStatus as localUpdateStatus,
  getApprovedSubmissions as localApproved,
  getPendingSubmissions as localPending,
  getBannedCodes as localBanned, banCode as localBan, unbanCode as localUnban,
  isCodeBanned as localIsBanned, resetParticipantData as localResetData,
  getResourceClicks as localGetClicks, recordResourceClick as localRecordClick,
  getResourceSessions as localGetSessions, getResourceStats as localGetStats,
  saveLocalLog as localSaveLog, getLocalLogs as localGetLogs,
} from './storage'
import {
  getAnnouncement as localGetAnnouncement,
  setAnnouncement as localSetAnnouncement,
} from './announcement'

// ── helpers ──────────────────────────────────────────────────────────────
function ok(data) { return { data, error: null } }
function err(error) { return { data: null, error } }

// ───────────────────────────────────────────────────────────────────────────
// PARTICIPANTS
// ───────────────────────────────────────────────────────────────────────────

export async function validateCode(code) {
  if (!HAS_SUPABASE) {
    if (DEMO_REGISTRATION_CODES.includes(code)) {
      return { code, display_name: null, county: null, banned: false }
    }
    const p = mockParticipants.find((x) => x.code === code)
    if (!p) return null
    if (localIsBanned(code)) return null
    return { ...p, banned: false }
  }
  const { data, error } = await supabase
    .from('participants')
    .select('code, display_name, county, banned')
    .eq('code', code)
    .maybeSingle()
  if (error) { console.error('validateCode', error); return null }
  if (!data || data.banned) return null
  return data
}

export async function upsertParticipantProfile(code, displayName, county) {
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase
    .from('participants')
    .update({ display_name: displayName, county })
    .eq('code', code)
  return error ? err(error) : ok(null)
}

export async function getAllParticipants() {
  if (!HAS_SUPABASE) {
    return mockParticipants.map((p) => ({
      ...p, banned: localIsBanned(p.code),
    }))
  }
  const { data, error } = await supabase
    .from('participants')
    .select('code, display_name, county, banned, created_at')
    .order('code')
  if (error) { console.error(error); return [] }
  return data || []
}

// ───────────────────────────────────────────────────────────────────────────
// ACTIVITY LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function insertActivityLog(code, log) {
  if (!HAS_SUPABASE) {
    // Dev mode: localStorage is the only store
    localSaveLog(log)
    return ok(null)
  }
  // Prod mode: write only to Supabase (avoids duplicate-id bug across stores)
  const { error } = await supabase.from('activity_logs').insert({
    participant_code: code,
    date: log.date,
    activity_type: log.activity_type,
    miles: log.miles,
    notes: log.notes || null,
  })
  return error ? err(error) : ok(null)
}

export async function getMyActivityLogs(code) {
  if (!HAS_SUPABASE) {
    const local = localGetLogs()
    const mock = getLogsForCode(code)
    const byId = {}
    mock.forEach((l) => { byId[l.id] = l })
    local.forEach((l) => { byId[l.id] = l })
    return Object.values(byId).sort((a, b) => b.date.localeCompare(a.date))
  }
  // Prod: Supabase is the only source of truth — no localStorage merge
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, date, activity_type, miles, notes, created_at')
    .eq('participant_code', code)
    .order('date', { ascending: false })
  if (error) { console.error('getMyActivityLogs:', error); return [] }
  return data || []
}

export async function getAllActivityLogs() {
  if (!HAS_SUPABASE) return mockActivityLogs
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, participant_code, date, activity_type, miles, notes, created_at')
  if (error) { console.error(error); return [] }
  return data || []
}

// ───────────────────────────────────────────────────────────────────────────
// LEADERBOARD + STATS
// ───────────────────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 25) {
  if (!HAS_SUPABASE) return mockLeaderboard()
  const { data, error } = await supabase
    .from('leaderboard')
    .select('code, display_name, county, total_miles')
    .limit(limit)
  if (error) { console.error(error); return [] }
  return (data || []).map((r) => ({
    code: r.code,
    display_name: r.display_name,
    county: r.county,
    totalMiles: Number(r.total_miles),
  }))
}

export async function getCountyStats() {
  if (!HAS_SUPABASE) return mockCountyStats()
  const { data, error } = await supabase
    .from('county_stats')
    .select('county, participants, total_miles, avg_miles')
  if (error) { console.error(error); return [] }
  return (data || []).map((r) => ({
    county: r.county,
    participants: r.participants,
    totalMiles: Number(r.total_miles),
    avgMiles: Number(r.avg_miles),
  }))
}

export async function getStatsStatewide() {
  if (!HAS_SUPABASE) return mockStatewide()
  // Only count participants who have actually registered (display_name set)
  const [{ count: pCount }, { data: lbData }] = await Promise.all([
    supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('banned', false)
      .not('display_name', 'is', null),
    supabase.from('leaderboard').select('total_miles'),
  ])
  const totalMiles = (lbData || []).reduce((s, r) => s + Number(r.total_miles || 0), 0)
  const challengeEnd = new Date('2026-09-24T00:00:00')
  const daysRemaining = Math.max(0, Math.ceil((challengeEnd - new Date()) / 86400000))
  return {
    totalParticipants: pCount || 0,
    totalMiles: parseFloat(totalMiles.toFixed(1)),
    daysRemaining,
  }
}

export async function getTotalMilesForCodeAsync(code) {
  if (!HAS_SUPABASE) return getTotalMilesForCode(code)
  const { data, error } = await supabase
    .from('activity_logs')
    .select('miles')
    .eq('participant_code', code)
  if (error) { console.error(error); return 0 }
  return (data || []).reduce((s, r) => s + Number(r.miles), 0)
}

// ───────────────────────────────────────────────────────────────────────────
// COMMUNITY SUBMISSIONS
// ───────────────────────────────────────────────────────────────────────────

export async function saveSubmission(sub) {
  if (!HAS_SUPABASE) { localSaveSubmission(sub); return ok(null) }
  const { error } = await supabase.from('community_submissions').insert({
    type: sub.type,
    content: sub.content,
    caption: sub.caption || null,
    display_name: sub.displayName || null,
    county: sub.county || null,
    status: 'pending',
  })
  return error ? err(error) : ok(null)
}

export async function getApprovedSubmissions() {
  if (!HAS_SUPABASE) return localApproved()
  const { data, error } = await supabase
    .from('community_submissions')
    .select('id, type, content, caption, status, submitted_at')
    .eq('status', 'approved')
    .order('submitted_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data || []).map((r) => ({
    id: r.id, type: r.type, content: r.content, caption: r.caption,
    status: r.status, submittedAt: r.submitted_at,
  }))
}

export async function getPendingSubmissions() {
  if (!HAS_SUPABASE) return localPending()
  const { data, error } = await supabase
    .from('community_submissions')
    .select('id, type, content, caption, display_name, county, status, submitted_at')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data || []).map((r) => ({
    id: r.id, type: r.type, content: r.content, caption: r.caption,
    displayName: r.display_name, county: r.county, status: r.status,
    submittedAt: r.submitted_at,
  }))
}

export async function getAllSubmissions() {
  if (!HAS_SUPABASE) return getSubmissions()
  const { data, error } = await supabase
    .from('community_submissions')
    .select('id, type, content, caption, display_name, county, status, submitted_at')
    .order('submitted_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data || []).map((r) => ({
    id: r.id, type: r.type, content: r.content, caption: r.caption,
    displayName: r.display_name, county: r.county, status: r.status,
    submittedAt: r.submitted_at,
  }))
}

export async function updateSubmissionStatus(id, status) {
  if (!HAS_SUPABASE) { localUpdateStatus(id, status); return ok(null) }
  const { error } = await supabase
    .from('community_submissions')
    .update({ status })
    .eq('id', id)
  return error ? err(error) : ok(null)
}

// ───────────────────────────────────────────────────────────────────────────
// MODERATION
// ───────────────────────────────────────────────────────────────────────────

export async function setBanned(code, banned) {
  if (!HAS_SUPABASE) {
    if (banned) localBan(code); else localUnban(code)
    return ok(null)
  }
  const { error } = await supabase
    .from('participants')
    .update({ banned })
    .eq('code', code)
  return error ? err(error) : ok(null)
}

export async function isCodeBanned(code) {
  if (!HAS_SUPABASE) return localIsBanned(code)
  const { data } = await supabase
    .from('participants')
    .select('banned')
    .eq('code', code)
    .maybeSingle()
  return !!data?.banned
}

export async function getBannedCodes() {
  if (!HAS_SUPABASE) return localBanned()
  const { data } = await supabase
    .from('participants')
    .select('code')
    .eq('banned', true)
  return (data || []).map((r) => r.code)
}

export async function resetParticipantName(code) {
  if (!HAS_SUPABASE) return ok(null) // mock data only; no persisted change
  const { error } = await supabase
    .from('participants')
    .update({ display_name: null })
    .eq('code', code)
  return error ? err(error) : ok(null)
}

export async function resetParticipantData(code) {
  localResetData(code)
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('participant_code', code)
  return error ? err(error) : ok(null)
}

// ───────────────────────────────────────────────────────────────────────────
// RESOURCE ANALYTICS
// ───────────────────────────────────────────────────────────────────────────

export async function recordResourceClick(resourceId, resourceName) {
  localRecordClick(resourceId) // keep local count too
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase.from('resource_clicks').insert({
    resource_id: resourceId,
    resource_name: resourceName || `Resource ${resourceId}`,
  })
  return error ? err(error) : ok(null)
}

export async function recordResourceSession(resourceId, resourceName, durationSeconds) {
  if (durationSeconds < 2) return ok(null)
  if (!HAS_SUPABASE) return ok(null)  // localStorage version already handled by storage.js
  const { error } = await supabase.from('resource_sessions').insert({
    resource_id: resourceId,
    resource_name: resourceName || `Resource ${resourceId}`,
    duration_seconds: durationSeconds,
  })
  return error ? err(error) : ok(null)
}

export async function getResourceStats() {
  if (!HAS_SUPABASE) return localGetStats()
  const { data, error } = await supabase
    .from('resource_stats')
    .select('resource_id, clicks, session_count, total_seconds, avg_seconds')
  if (error) { console.error(error); return {} }
  const byId = {}
  ;(data || []).forEach((r) => {
    byId[r.resource_id] = {
      clicks: r.clicks || 0,
      sessionCount: r.session_count || 0,
      totalSeconds: r.total_seconds || 0,
      avgSeconds: r.avg_seconds,
    }
  })
  return byId
}

// ───────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ───────────────────────────────────────────────────────────────────────────

export async function getAnnouncement() {
  if (!HAS_SUPABASE) return localGetAnnouncement()
  const { data } = await supabase
    .from('announcements')
    .select('text, updated_at')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return { text: '', updated: '' }
  return { text: data.text || '', updated: data.updated_at || '' }
}

export async function setAnnouncement(text) {
  if (!HAS_SUPABASE) { localSetAnnouncement(text); return ok(null) }
  const trimmed = (text || '').trim()
  if (!trimmed) {
    await supabase.from('announcements').delete().eq('id', 1)
    return ok(null)
  }
  const { error } = await supabase
    .from('announcements')
    .upsert({ id: 1, text: trimmed, updated_at: new Date().toISOString() })
  return error ? err(error) : ok(null)
}
