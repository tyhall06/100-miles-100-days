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
  mockParticipants, mockActivityLogs, mockTeams,
  DEMO_REGISTRATION_CODES, getLogsForCode, getLeaderboard as mockLeaderboard,
  getCountyStats as mockCountyStats, getStatsStatewide as mockStatewide,
  getTeamLeaderboard as mockTeamLeaderboard,
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
  getLocalTeams, addLocalTeam, setLocalTeamSelection, getTeamId,
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
    .select('code, display_name, county, banned, team_id, created_at')
    .order('code')
  if (error) { console.error(error); return [] }
  return data || []
}

// Bulk-import participant codes (admin only — runs as an authenticated user).
// Accepts an array of strings; keeps only unique, exact 4-digit codes.
// Codes that already exist are skipped (never overwritten), so re-importing a
// growing list is safe. Returns { data: { added, skipped, total }, error }.
export async function importParticipantCodes(rawCodes) {
  const cleaned = [...new Set(
    (rawCodes || [])
      .map((c) => String(c).trim())
      .filter((c) => /^\d{4}$/.test(c))
  )]
  if (cleaned.length === 0) return ok({ added: 0, skipped: 0, total: 0 })
  if (!HAS_SUPABASE) {
    // Dev mode has no real participants table; report as if all were added.
    return ok({ added: cleaned.length, skipped: 0, total: cleaned.length })
  }
  let added = 0
  const CHUNK = 500
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    const batch = cleaned.slice(i, i + CHUNK).map((code) => ({ code }))
    // ignoreDuplicates: existing codes are left untouched; .select() returns
    // only the rows actually inserted, giving an accurate "added" count.
    const { data, error } = await supabase
      .from('participants')
      .upsert(batch, { onConflict: 'code', ignoreDuplicates: true })
      .select('code')
    if (error) return err(error)
    added += (data || []).length
  }
  return ok({ added, skipped: cleaned.length - added, total: cleaned.length })
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

// Admin: delete a single activity log by id (allowed by logs_admin_delete).
export async function deleteActivityLog(id) {
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase.from('activity_logs').delete().eq('id', id)
  return error ? err(error) : ok(null)
}

// Admin: correct a log's date and/or miles (needs logs_admin_update policy).
export async function updateActivityLog(id, fields) {
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase.from('activity_logs').update(fields).eq('id', id)
  return error ? err(error) : ok(null)
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
// TEAMS
// ───────────────────────────────────────────────────────────────────────────

// All teams with their registered-member counts (for the registration search
// step and admin tools). Sorted alphabetically.
export async function getTeams() {
  if (!HAS_SUPABASE) {
    const counts = {}
    mockParticipants.forEach((p) => {
      if (p.team_id) counts[p.team_id] = (counts[p.team_id] || 0) + 1
    })
    const all = [...mockTeams, ...getLocalTeams()]
    return all
      .map((t) => ({ id: t.id, name: t.name, members: counts[t.id] || 0 }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  }
  const { data, error } = await supabase
    .from('team_directory')
    .select('id, name, members')
  if (error) { console.error('getTeams', error); return [] }
  return (data || []).map((r) => ({ id: r.id, name: r.name, members: r.members || 0 }))
}

// Create a team (or return the existing one if the name already exists,
// case-insensitively). Returns { data: { id, name, existed }, error }.
export async function createTeam(rawName) {
  const name = (rawName || '').trim()
  if (name.length < 2 || name.length > 40) {
    return err(new Error('Team name must be 2–40 characters.'))
  }
  if (!HAS_SUPABASE) {
    const before = getLocalTeams()
    const dup = before.find((t) => t.name.toLowerCase() === name.toLowerCase())
      || mockTeams.find((t) => t.name.toLowerCase() === name.toLowerCase())
    const team = addLocalTeam(name)
    return ok({ id: team.id, name: team.name, existed: !!dup })
  }
  // Case-insensitive duplicate check first (the unique index is the real guard).
  const { data: existing } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle()
  if (existing) return ok({ id: existing.id, name: existing.name, existed: true })

  const { data, error } = await supabase
    .from('teams')
    .insert({ name })
    .select('id, name')
    .maybeSingle()
  if (error) {
    // 23505 = unique_violation (someone created it in the race window)
    if (error.code === '23505') {
      const { data: again } = await supabase
        .from('teams').select('id, name').ilike('name', name).maybeSingle()
      if (again) return ok({ id: again.id, name: again.name, existed: true })
    }
    return err(error)
  }
  return ok({ id: data.id, name: data.name, existed: false })
}

// Assign (or clear, with teamId = null) a participant's team.
export async function setParticipantTeam(code, teamId) {
  setLocalTeamSelection(teamId)  // keep the per-device copy in sync
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase
    .from('participants')
    .update({ team_id: teamId })
    .eq('code', code)
  return error ? err(error) : ok(null)
}

// Read a single participant's current team_id (null = flying solo).
export async function getParticipantTeamId(code) {
  if (!HAS_SUPABASE) return getTeamId()
  const { data, error } = await supabase
    .from('participants')
    .select('team_id')
    .eq('code', code)
    .maybeSingle()
  if (error) { console.error('getParticipantTeamId', error); return null }
  return data?.team_id || null
}

// Read team_id + whether the participant has already used their one self-switch.
// Resilient to the migration not having run yet: if the team_changed column
// doesn't exist, falls back to team_id only (so the card still works correctly).
export async function getParticipantTeamInfo(code) {
  if (!HAS_SUPABASE) return { teamId: getTeamId(), teamChanged: false }
  let { data, error } = await supabase
    .from('participants')
    .select('team_id, team_changed')
    .eq('code', code)
    .maybeSingle()
  if (error) {
    const res = await supabase
      .from('participants')
      .select('team_id')
      .eq('code', code)
      .maybeSingle()
    if (res.error) { console.error('getParticipantTeamInfo', res.error); return { teamId: null, teamChanged: false } }
    return { teamId: res.data?.team_id || null, teamChanged: false }
  }
  return { teamId: data?.team_id || null, teamChanged: !!data?.team_changed }
}

// Self-service team SWITCH (moving from one team to another). Sets team_changed
// so the participant can't keep hopping; admins can clear the flag to allow more.
export async function switchParticipantTeam(code, teamId) {
  setLocalTeamSelection(teamId)
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase
    .from('participants')
    .update({ team_id: teamId, team_changed: true })
    .eq('code', code)
  return error ? err(error) : ok(null)
}

export async function getTeamLeaderboard() {
  if (!HAS_SUPABASE) return mockTeamLeaderboard()
  const { data, error } = await supabase
    .from('team_leaderboard')
    .select('team_id, team_name, members, total_miles, avg_miles')
  if (error) { console.error('getTeamLeaderboard', error); return [] }
  return (data || []).map((r) => ({
    teamId: r.team_id,
    teamName: r.team_name,
    members: r.members,
    totalMiles: Number(r.total_miles),
    avgMiles: Number(r.avg_miles),
  }))
}

// ── Admin team management ───────────────────────────────────────────────────

export async function renameTeam(id, rawName) {
  const name = (rawName || '').trim()
  if (name.length < 2 || name.length > 40) {
    return err(new Error('Team name must be 2–40 characters.'))
  }
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase.from('teams').update({ name }).eq('id', id)
  return error ? err(error) : ok(null)
}

// Move every member of `sourceId` into `targetId`, then delete the source team.
export async function mergeTeams(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) {
    return err(new Error('Pick two different teams to merge.'))
  }
  if (!HAS_SUPABASE) return ok(null)
  const { error: moveErr } = await supabase
    .from('participants')
    .update({ team_id: targetId })
    .eq('team_id', sourceId)
  if (moveErr) return err(moveErr)
  const { error: delErr } = await supabase.from('teams').delete().eq('id', sourceId)
  return delErr ? err(delErr) : ok(null)
}

// Delete a team. Members' team_id is set to NULL automatically (FK on delete set null).
export async function deleteTeam(id) {
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase.from('teams').delete().eq('id', id)
  return error ? err(error) : ok(null)
}

// Reassign a single participant to a team (or null for solo). Used to fix
// fat-finger sign-up mistakes.
export async function reassignParticipant(code, teamId) {
  if (!HAS_SUPABASE) return ok(null)
  const { error } = await supabase
    .from('participants')
    .update({ team_id: teamId || null })
    .eq('code', code)
  return error ? err(error) : ok(null)
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
