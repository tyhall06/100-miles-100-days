// localStorage helpers for 100 Miles, 100 Days
// Zero PII stored — only 4-digit code, display name, and county.

export function getCode() {
  return localStorage.getItem('participant_code') || null
}

export function getDisplayName() {
  return localStorage.getItem('display_name') || null
}

export function getCounty() {
  return localStorage.getItem('county') || null
}

export function saveParticipant(code, displayName, county) {
  localStorage.setItem('participant_code', code)
  localStorage.setItem('display_name', displayName)
  localStorage.setItem('county', county)
  // PRODUCTION: upsert to Supabase participants table
}

export function clearParticipant() {
  localStorage.removeItem('participant_code')
  localStorage.removeItem('display_name')
  localStorage.removeItem('county')
  localStorage.removeItem('team_id')
}

// ── Teams (dev-mode only) ────────────────────────────────────────────────────
// In production, teams live in Supabase. These helpers back the dev/localStorage
// registration flow so the "create or join a team" step works without a backend.

export function getLocalTeams() {
  try {
    const raw = localStorage.getItem('local_teams')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addLocalTeam(name) {
  const teams = getLocalTeams()
  const existing = teams.find((t) => t.name.toLowerCase() === name.trim().toLowerCase())
  if (existing) return existing
  const team = { id: `local-${Date.now()}`, name: name.trim() }
  teams.push(team)
  localStorage.setItem('local_teams', JSON.stringify(teams))
  return team
}

export function getTeamId() {
  return localStorage.getItem('team_id') || null
}

export function setLocalTeamSelection(teamId) {
  if (teamId) localStorage.setItem('team_id', teamId)
  else localStorage.removeItem('team_id')
}

export function saveLocalLog(log) {
  const code = getCode()
  if (!code) return
  const existing = getLocalLogs()
  existing.push(log)
  localStorage.setItem(`logs_${code}`, JSON.stringify(existing))
}

export function getLocalLogs() {
  const code = getCode()
  if (!code) return []
  try {
    const raw = localStorage.getItem(`logs_${code}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getResourceClicks() {
  try {
    const raw = localStorage.getItem('resource_clicks')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function recordResourceClick(resourceId) {
  const clicks = getResourceClicks()
  clicks[resourceId] = (clicks[resourceId] || 0) + 1
  localStorage.setItem('resource_clicks', JSON.stringify(clicks))
  // PRODUCTION: POST to Supabase resource_clicks table (resource_id, resource_name, clicked_at)
}

// ── Time-on-resource tracking ────────────────────────────────────────────────
// Records how long a user spent on each resource (no user identifier attached).
// PRODUCTION: Store sessions in Supabase resource_sessions table:
//   resource_id, resource_name, duration_seconds, recorded_at

export function recordResourceOpen(resourceId, resourceName) {
  // Close any existing open session before starting a new one
  recordResourceClose()
  localStorage.setItem('resource_open_session', JSON.stringify({
    resourceId,
    resourceName,
    startTime: Date.now(),
  }))
}

export function recordResourceClose() {
  let payload = null
  try {
    const raw = localStorage.getItem('resource_open_session')
    if (!raw) return null
    const session = JSON.parse(raw)
    const durationSeconds = Math.round((Date.now() - session.startTime) / 1000)
    if (durationSeconds >= 2) {
      const sessions = getResourceSessions()
      sessions.push({
        resourceId: session.resourceId,
        resourceName: session.resourceName,
        durationSeconds,
      })
      localStorage.setItem('resource_sessions', JSON.stringify(sessions))
      payload = {
        resourceId: session.resourceId,
        resourceName: session.resourceName,
        durationSeconds,
      }
    }
  } catch { /* ignore */ } finally {
    localStorage.removeItem('resource_open_session')
  }
  return payload
}

export function getResourceSessions() {
  try {
    const raw = localStorage.getItem('resource_sessions')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

// Returns per-resource stats: { [resourceId]: { clicks, sessionCount, totalSeconds, avgSeconds } }
export function getResourceStats() {
  const clicks = getResourceClicks()
  const sessions = getResourceSessions()
  const byId = {}

  Object.keys(clicks).forEach((id) => {
    byId[id] = { clicks: clicks[id], sessionCount: 0, totalSeconds: 0, avgSeconds: null }
  })

  sessions.forEach(({ resourceId, durationSeconds }) => {
    const id = String(resourceId)
    if (!byId[id]) byId[id] = { clicks: 0, sessionCount: 0, totalSeconds: 0, avgSeconds: null }
    byId[id].sessionCount += 1
    byId[id].totalSeconds += durationSeconds
  })

  Object.keys(byId).forEach((id) => {
    const r = byId[id]
    r.avgSeconds = r.sessionCount > 0 ? Math.round(r.totalSeconds / r.sessionCount) : null
  })

  return byId
}

// ── Community submissions (photos + stories, moderated) ──────────────────────
// Each submission: { id, type: 'photo'|'story', content, displayName, county,
//   submittedAt, status: 'pending'|'approved'|'rejected' }
// For photos: content is a base64 data URL
// For stories: content is text (max 500 chars)
// PRODUCTION: Store in Supabase community_submissions table with RLS so only
// approved rows are publicly readable.

export function getSubmissions() {
  try {
    const raw = localStorage.getItem('community_submissions')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveSubmission(submission) {
  const all = getSubmissions()
  all.push({ ...submission, status: 'pending', submittedAt: new Date().toISOString() })
  localStorage.setItem('community_submissions', JSON.stringify(all))
}

export function updateSubmissionStatus(id, status) {
  const all = getSubmissions()
  const next = all.map((s) => (s.id === id ? { ...s, status } : s))
  localStorage.setItem('community_submissions', JSON.stringify(next))
}

export function getApprovedSubmissions() {
  return getSubmissions().filter((s) => s.status === 'approved')
}

export function getPendingSubmissions() {
  return getSubmissions().filter((s) => s.status === 'pending')
}

// ── Code moderation (ban + data reset) ───────────────────────────────────────
// PRODUCTION: Store banned status as a column on Supabase participants table.

export function getBannedCodes() {
  try {
    const raw = localStorage.getItem('banned_codes')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function banCode(code) {
  const banned = getBannedCodes()
  if (!banned.includes(code)) {
    banned.push(code)
    localStorage.setItem('banned_codes', JSON.stringify(banned))
  }
}

export function unbanCode(code) {
  const banned = getBannedCodes().filter((c) => c !== code)
  localStorage.setItem('banned_codes', JSON.stringify(banned))
}

export function isCodeBanned(code) {
  return getBannedCodes().includes(code)
}

export function resetParticipantData(code) {
  // Clear activity logs for this code
  localStorage.removeItem(`logs_${code}`)
  // PRODUCTION: DELETE FROM activity_logs WHERE participant_code = code
}
