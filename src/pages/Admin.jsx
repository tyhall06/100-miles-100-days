import { useState, useEffect } from 'react'
import {
  getAllParticipants, getAllActivityLogs, getStatsStatewide,
  getResourceStats, getPendingSubmissions, getApprovedSubmissions,
  updateSubmissionStatus, setBanned, getBannedCodes,
  resetParticipantData, resetParticipantName, getAllSubmissions,
  getAnnouncement, setAnnouncement,
  getTeams, renameTeam, deleteTeam, mergeTeams, reassignParticipant,
  importParticipantCodes,
} from '../lib/db'
import { toCSV, downloadCSV } from '../lib/csv'
import { signInAdmin, signOutAdmin, getAdminSession, onAuthChange } from '../lib/auth'
import { HAS_SUPABASE } from '../lib/supabase'

function formatTimestamp(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch { return iso || '' }
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const RESOURCE_NAMES = {
  1:  { name: 'Walking for Wellness',                       category: 'Getting Started' },
  2:  { name: 'Warm-up & Cool-down Guide',                  category: 'Getting Started' },
  3:  { name: '20-Minute Guided Walk',                      category: 'Walking & Movement' },
  4:  { name: 'Walk Audit Video',                           category: 'Walking & Movement' },
  5:  { name: 'Wellness in Motion Video',                   category: 'Walking & Movement' },
  6:  { name: 'Motivational Walking Podcast',               category: 'Podcasts' },
  7:  { name: 'Sun Protection Podcast',                     category: 'Podcasts' },
  8:  { name: 'Managing Exercise in the Heat',              category: 'Handouts' },
  9:  { name: 'Stay Strong, Stay Healthy',                  category: 'MU Extension Programs' },
  10: { name: 'Tai Chi for Arthritis & Falls Prevention',   category: 'MU Extension Programs' },
  11: { name: 'Walk With Ease',                             category: 'MU Extension Programs' },
}

function PasswordGate({ onAuth }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const res = HAS_SUPABASE
      ? await signInAdmin(email, pw)
      : await signInAdmin(pw)
    setBusy(false)
    if (res.ok) onAuth()
    else setError(res.error || 'Sign-in failed.')
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#000000] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#F1B82D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-[#000000] mb-1">Admin Access</h1>
          <p className="text-gray-500 text-sm">MU Extension staff only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {HAS_SUPABASE && (
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              autoFocus
            />
          )}
          <input
            type="password"
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
            placeholder="Password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError('') }}
            autoFocus={!HAS_SUPABASE}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors disabled:opacity-40"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
      <div className="text-3xl font-extrabold text-[#8B6914]">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  )
}

function AnnouncementEditor() {
  const [text, setText] = useState('')
  const [updated, setUpdated] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAnnouncement().then(({ text, updated }) => {
      setText(text); setUpdated(updated)
    })
  }, [])

  async function handleSave() {
    await setAnnouncement(text)
    const next = await getAnnouncement()
    setUpdated(next.updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleClear() {
    if (!window.confirm('Clear the site-wide announcement?')) return
    await setAnnouncement('')
    setText('')
    setUpdated('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="font-bold text-[#000000]">Site-wide Announcement</h2>
        {updated && (
          <span className="text-xs text-gray-400">
            Last updated {new Date(updated).toLocaleString()}
          </span>
        )}
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Post a teal banner visible on every page until participants dismiss it.
          Keep it short — 1–2 sentences.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="e.g. Heads up — the leaderboard will refresh tonight at 9pm."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
        />
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{text.length}/280</span>
          {saved && <span className="text-green-600 font-semibold">Saved ✓</span>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 bg-[#F1B82D] text-black font-bold py-2.5 rounded-xl hover:bg-[#d4a228] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Publish Banner
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!updated}
            className="px-5 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        {/* PRODUCTION: UPSERT into Supabase announcements table; all clients poll on mount */}
      </div>
    </section>
  )
}

function parseCodes(text) {
  return (text || '')
    .split(/[\s,;]+/)
    .map((tok) => tok.trim())
    .filter((tok) => /^\d{4}$/.test(tok))
}

function CodeImporter({ onImported }) {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const detected = parseCodes(raw)
  const uniqueCount = new Set(detected).size

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setRaw(String(reader.result || '')); setError(''); setResult(null) }
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting the same file
  }

  async function handleImport() {
    setError(''); setResult(null)
    if (uniqueCount === 0) { setError('No valid 4-digit codes found. Paste codes or upload your supabase-codes.csv.'); return }
    setBusy(true)
    const { data, error } = await importParticipantCodes(detected)
    setBusy(false)
    if (error) { setError(error.message || 'Import failed.'); return }
    setResult(data)
    setRaw('')
    onImported?.()
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-bold text-[#000000]">Import Participant Codes</h2>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Paste 4-digit codes (one per line, or comma-separated) or upload the
          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mx-1">supabase-codes.csv</span>
          file from the code generator. Only the codes are added — never emails or names.
          Codes that already exist are skipped, so re-importing a growing list is safe.
        </p>

        <textarea
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setError(''); setResult(null) }}
          rows={5}
          placeholder={'4821\n5093\n6210'}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 w-fit">
            <span>📄 Upload CSV / TXT</span>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFile} className="hidden" />
          </label>
          <span className="text-xs text-gray-400">
            {uniqueCount > 0 ? `${uniqueCount} valid code${uniqueCount === 1 ? '' : 's'} detected` : 'No codes detected yet'}
          </span>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy || uniqueCount === 0}
            className="sm:ml-auto bg-[#F1B82D] text-black font-bold px-6 py-2.5 rounded-xl hover:bg-[#d4a228] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Importing…' : 'Import Codes'}
          </button>
        </div>

        {error && <p role="alert" className="text-red-600 text-sm font-medium">{error}</p>}
        {result && (
          <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            ✓ Imported {result.total} code{result.total === 1 ? '' : 's'}: {result.added} added,{' '}
            {result.skipped} already existed.
          </p>
        )}
      </div>
    </section>
  )
}

function ExportButton({ icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-bold text-[#000000]">{title}</div>
      <div className="text-xs text-gray-500 mt-1">Download CSV</div>
    </button>
  )
}

function AdminDashboard({ onSignOut }) {
  const [participants, setParticipants] = useState([])
  const [bannedSet, setBannedSet] = useState(new Set())
  const [pending, setPending] = useState([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [resourceStats, setResourceStats] = useState({})
  const [allLogs, setAllLogs] = useState([])
  const [statewide, setStatewide] = useState({ totalParticipants: 0, totalMiles: 0, daysRemaining: 0 })
  const [teams, setTeams] = useState([])

  async function refreshAll() {
    const [p, banned, pend, appr, rs, logs, sw, tm] = await Promise.all([
      getAllParticipants(),
      getBannedCodes(),
      getPendingSubmissions(),
      getApprovedSubmissions(),
      getResourceStats(),
      getAllActivityLogs(),
      getStatsStatewide(),
      getTeams(),
    ])
    setParticipants(p)
    setBannedSet(new Set(banned))
    setPending(pend)
    setApprovedCount(appr.length)
    setResourceStats(rs)
    setAllLogs(logs)
    setStatewide(sw)
    setTeams(tm)
  }

  useEffect(() => { refreshAll() }, [])

  const totalClicks = Object.values(resourceStats).reduce((s, r) => s + (r.clicks || 0), 0)
  const totalParticipants = statewide.totalParticipants
  const totalMiles = statewide.totalMiles
  const daysRemaining = statewide.daysRemaining
  const totalEntries = allLogs.length
  const avgMilesPerParticipant = totalParticipants
    ? (totalMiles / totalParticipants).toFixed(1) : '0'

  const activityCounts = {}
  allLogs.forEach((l) => {
    activityCounts[l.activity_type] = (activityCounts[l.activity_type] || 0) + 1
  })
  const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  async function handleResetName(code) {
    await resetParticipantName(code)
    setParticipants((prev) =>
      prev.map((p) => (p.code === code ? { ...p, display_name: null } : p))
    )
  }

  async function handleResetData(code) {
    if (!window.confirm('This will delete all their logged activities. Continue?')) return
    await resetParticipantData(code)
    refreshAll()
  }

  async function handleToggleBan(code) {
    const banned = bannedSet.has(code)
    const msg = banned
      ? 'Unban this participant? They will regain access.'
      : 'Ban this participant? They will be unable to log in.'
    if (!window.confirm(msg)) return
    await setBanned(code, !banned)
    const next = new Set(bannedSet)
    if (banned) next.delete(code); else next.add(code)
    setBannedSet(next)
  }

  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')

  const teamName = (id) => teams.find((tm) => tm.id === id)?.name || '—'

  async function handleRenameTeam(id) {
    const current = teamName(id)
    const next = window.prompt('Rename team:', current === '—' ? '' : current)
    if (next === null) return
    const { error } = await renameTeam(id, next)
    if (error) { window.alert(error.message || 'Could not rename team.'); return }
    refreshAll()
  }

  async function handleDeleteTeam(id) {
    if (!window.confirm(`Delete "${teamName(id)}"? Members will become solo (their miles are kept).`)) return
    await deleteTeam(id)
    refreshAll()
  }

  async function handleMergeTeams() {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
    if (!window.confirm(`Move everyone from "${teamName(mergeSource)}" into "${teamName(mergeTarget)}" and delete "${teamName(mergeSource)}"?`)) return
    const { error } = await mergeTeams(mergeSource, mergeTarget)
    if (error) { window.alert(error.message || 'Could not merge teams.'); return }
    setMergeSource(''); setMergeTarget('')
    refreshAll()
  }

  async function handleReassign(code, teamId) {
    await reassignParticipant(code, teamId || null)
    setParticipants((prev) =>
      prev.map((p) => (p.code === code ? { ...p, team_id: teamId || null } : p))
    )
    // member counts changed — refresh the teams list
    getTeams().then(setTeams).catch(() => {})
  }

  async function handleModerate(id, status) {
    await updateSubmissionStatus(id, status)
    const [pend, appr] = await Promise.all([getPendingSubmissions(), getApprovedSubmissions()])
    setPending(pend)
    setApprovedCount(appr.length)
  }

  function exportParticipants() {
    const rows = participants.map((p) => ({
      code: p.code,
      display_name: p.display_name || '',
      county: p.county || '',
      team: p.team_id ? teamName(p.team_id) : '',
      status: bannedSet.has(p.code) ? 'banned' : 'active',
      created_at: p.created_at || '',
    }))
    const csv = toCSV(rows, ['code', 'display_name', 'county', 'team', 'status', 'created_at'])
    downloadCSV(`100miles-participants-${todayStr()}.csv`, csv)
  }

  function exportActivityLogs() {
    const rows = allLogs.map((l) => ({
      code: l.participant_code,
      date: l.date,
      activity_type: l.activity_type,
      miles: l.miles,
      notes: l.notes || '',
    }))
    const csv = toCSV(rows, ['code', 'date', 'activity_type', 'miles', 'notes'])
    downloadCSV(`100miles-activity-logs-${todayStr()}.csv`, csv)
  }

  function exportResourceAnalytics() {
    const rows = Object.entries(RESOURCE_NAMES).map(([id, info]) => {
      const stat = resourceStats[id] || { clicks: 0, avgSeconds: null, totalSeconds: 0 }
      return {
        id, name: info.name, category: info.category,
        clicks: stat.clicks || 0,
        avg_seconds: stat.avgSeconds ?? '',
        total_seconds: stat.totalSeconds || 0,
      }
    })
    const csv = toCSV(rows, ['id', 'name', 'category', 'clicks', 'avg_seconds', 'total_seconds'])
    downloadCSV(`100miles-resource-analytics-${todayStr()}.csv`, csv)
  }

  async function exportCommunitySubmissions() {
    const all = await getAllSubmissions()
    const rows = all.map((s) => ({
      id: s.id, type: s.type,
      content_preview: s.type === 'photo' ? '[photo]' : String(s.content || '').slice(0, 100),
      displayName: s.displayName || '', county: s.county || '',
      status: s.status || '', submittedAt: s.submittedAt || '',
    }))
    const csv = toCSV(rows, ['id', 'type', 'content_preview', 'displayName', 'county', 'status', 'submittedAt'])
    downloadCSV(`100miles-submissions-${todayStr()}.csv`, csv)
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            Admin Panel
          </span>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-extrabold text-[#000000]">MU Extension Admin</h1>
              <p className="text-gray-500 text-sm mt-1">100 Miles, 100 Days Dashboard</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm font-semibold text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Section -1: Announcement editor */}
        <AnnouncementEditor />

        {/* Section -0.5: Import participant codes */}
        <CodeImporter onImported={refreshAll} />

        {/* Section 0: Challenge Overview */}
        <section>
          <h2 className="font-bold text-[#000000] mb-4">Challenge Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard value={totalParticipants} label="Total Participants" />
            <StatCard value={totalMiles} label="Total Miles" />
            <StatCard value={totalEntries} label="Total Entries" />
            <StatCard value={avgMilesPerParticipant} label="Avg Miles/Participant" />
            <StatCard value={topActivity} label="Top Activity" />
            <StatCard value={daysRemaining} label="Days Remaining" />
          </div>
        </section>

        {/* Section 1: Display Name Moderation */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#000000]">Display Name Moderation</h2>
            <span className="text-xs text-gray-400">{participants.length} participants</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Display Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">County</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Team</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((p) => {
                  const banned = bannedSet.has(p.code)
                  return (
                    <tr key={p.code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-600">{p.code}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {p.display_name || (
                          <span className="text-gray-400 italic text-xs">not set</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{p.county}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <select
                          value={p.team_id || ''}
                          onChange={(e) => handleReassign(p.code, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 max-w-[10rem] focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
                          aria-label={`Team for ${p.code}`}
                        >
                          <option value="">Solo</option>
                          {teams.map((tm) => (
                            <option key={tm.id} value={tm.id}>{tm.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        {banned ? (
                          <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            Banned
                          </span>
                        ) : (
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
                          <button
                            onClick={() => handleResetName(p.code)}
                            disabled={!p.display_name}
                            className="text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Reset Name
                          </button>
                          <button
                            onClick={() => handleResetData(p.code)}
                            className="text-xs bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors font-semibold"
                          >
                            Reset Data
                          </button>
                          <button
                            onClick={() => handleToggleBan(p.code)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                              banned
                                ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {banned ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
            Resetting a name will prompt the participant to choose a new one on their next login.
            {/* PRODUCTION: UPDATE Supabase participants SET display_name = NULL */}
          </p>
        </section>

        {/* Section 1.25: Team Management */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#000000]">Team Management</h2>
            <span className="text-xs text-gray-400">{teams.length} teams</span>
          </div>

          <div className="p-6 space-y-6">
            {teams.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No teams have been created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teams.map((tm) => (
                      <tr key={tm.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{tm.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{tm.members}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleRenameTeam(tm.id)}
                              className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(tm.id)}
                              className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Merge duplicates */}
            {teams.length >= 2 && (
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">Merge duplicate teams</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <select
                    value={mergeSource}
                    onChange={(e) => setMergeSource(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
                  >
                    <option value="">Move everyone from…</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>{tm.name} ({tm.members})</option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-sm hidden sm:inline">→</span>
                  <select
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
                  >
                    <option value="">…into this team</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>{tm.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleMergeTeams}
                    disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}
                    className="text-sm bg-[#F1B82D] text-black font-bold px-5 py-2 rounded-lg hover:bg-[#d4a228] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Merge
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Reassign an individual to a different team using the Team dropdown in the participant table above.
              Deleting or merging a team never deletes anyone's logged miles.
            </p>
          </div>
        </section>

        {/* Section 1.5: Pending Submissions */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#000000]">Pending Submissions</h2>
            <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold px-3 py-1 rounded-full">
              {pending.length} pending
            </span>
          </div>

          <div className="p-6">
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No submissions awaiting review.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex flex-col"
                  >
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            s.type === 'photo'
                              ? 'bg-[#1C5E90] text-white'
                              : 'bg-[#F1B82D] text-black'
                          }`}
                        >
                          {s.type === 'photo' ? 'Photo' : 'Story'}
                        </span>
                      </div>

                      {s.type === 'photo' ? (
                        <>
                          <img
                            src={s.content}
                            alt={s.caption || 'Pending photo'}
                            className="w-full max-h-40 object-contain rounded-lg bg-white border border-gray-200 mb-3"
                          />
                          {s.caption && (
                            <p className="text-sm text-gray-700 mb-2">{s.caption}</p>
                          )}
                        </>
                      ) : (
                        <blockquote className="border-l-4 border-[#F1B82D] bg-white rounded-r-lg px-4 py-3 text-sm italic text-gray-800 mb-3">
                          {s.content}
                        </blockquote>
                      )}

                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{s.displayName || '—'}</span>
                        {' · '}
                        <span>{s.county || '—'}</span>
                        {' · '}
                        <span className="text-gray-400">{formatTimestamp(s.submittedAt)}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={() => handleModerate(s.id, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-2 rounded-xl transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerate(s.id, 'rejected')}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2 rounded-xl transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
              Recently Approved: <span className="font-semibold text-gray-600">{approvedCount}</span>
              {/* PRODUCTION: SELECT COUNT(*) FROM community_submissions WHERE status = 'approved' */}
            </p>
          </div>
        </section>

        {/* Section 1.75: Export Data */}
        <section>
          <h2 className="font-bold text-[#000000] mb-4">Export Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExportButton icon="👥" title="Participants" onClick={exportParticipants} />
            <ExportButton icon="📝" title="Activity Logs" onClick={exportActivityLogs} />
            <ExportButton icon="📊" title="Resource Analytics" onClick={exportResourceAnalytics} />
            <ExportButton icon="💬" title="Community Submissions" onClick={exportCommunitySubmissions} />
          </div>
        </section>

        {/* Section 2: Resource Analytics */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#000000]">Resource Analytics</h2>
            <span className="text-xs text-gray-400">Aggregate counts only — no user data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Accesses</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Avg Time</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(RESOURCE_NAMES).map(([id, info]) => {
                  const stat = resourceStats[id] || { clicks: 0, avgSeconds: null, totalSeconds: 0 }
                  return (
                    <tr key={id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{info.name}</td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{info.category}</td>
                      <td className="px-5 py-3 text-right">
                        {stat.clicks > 0
                          ? <span className="font-bold text-[#8B6914]">{stat.clicks}</span>
                          : <span className="text-gray-300">0</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 hidden md:table-cell">
                        {formatDuration(stat.avgSeconds)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 hidden lg:table-cell">
                        {stat.totalSeconds > 0 ? formatDuration(stat.totalSeconds) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td className="px-5 py-3 font-bold text-gray-900" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-right font-extrabold text-[#8B6914]">{totalClicks}</td>
                  <td className="px-5 py-3 hidden md:table-cell" />
                  <td className="px-5 py-3 hidden lg:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
            Aggregate only — no user identifiers attached to any resource data.
            {/* PRODUCTION: Query Supabase resource_clicks + resource_sessions, GROUP BY resource_id */}
          </p>
        </section>
      </div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    getAdminSession().then((s) => {
      setAuthed(!!s)
      setChecking(false)
    })
    unsub = onAuthChange((session) => setAuthed(!!session))
    return () => unsub()
  }, [])

  async function handleSignOut() {
    await signOutAdmin()
    setAuthed(false)
  }

  if (checking && HAS_SUPABASE) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  }
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />
  return <AdminDashboard onSignOut={handleSignOut} />
}
