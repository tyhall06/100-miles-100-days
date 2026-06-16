import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import CodeGate from '../components/CodeGate'
import { getCode, getDisplayName, getCounty } from '../lib/storage'
import {
  getMyActivityLogs, getTeams, createTeam, setParticipantTeam, getParticipantTeamId,
} from '../lib/db'
import { isProfane } from '../lib/filter'
import { useI18n } from '../lib/i18n'

const TEAM_FIELD_CLASS =
  'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D] transition-colors'

// Lets a participant who skipped (or wants to join) a team do so after sign-up.
// Reuses the same DB calls as registration — purely additive, no schema change.
function TeamCard({ code }) {
  const { t } = useI18n()
  const [teams, setTeams] = useState([])
  const [myTeamId, setMyTeamId] = useState(undefined) // undefined = still loading
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    Promise.all([getTeams(), getParticipantTeamId(code)])
      .then(([list, tid]) => { setTeams(list || []); setMyTeamId(tid || null) })
      .catch((e) => { console.error('TeamCard', e); setMyTeamId(null) })
  }, [code])

  const myTeam = teams.find((tm) => tm.id === myTeamId)
  const filtered = teams.filter((tm) =>
    tm.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  async function join(teamId) {
    setBusy(true); setError('')
    try {
      await setParticipantTeam(code, teamId)
      setMyTeamId(teamId)
      getTeams().then((l) => setTeams(l || [])).catch(() => {})
    } catch (e) {
      console.error('join team', e); setError(t('cg.teamErr'))
    } finally { setBusy(false) }
  }

  async function create() {
    const name = newName.trim()
    if (name.length < 2 || name.length > 40) { setError(t('cg.teamErrName')); return }
    if (isProfane(name)) { setError(t('cg.teamErrProfane')); return }
    if (!window.confirm(t('cg.teamCreateConfirm', { name }))) return
    setBusy(true); setError('')
    const { data, error: createErr } = await createTeam(name)
    if (createErr || !data) { setBusy(false); setError(t('cg.teamErr')); return }
    if (data.existed) window.alert(t('cg.teamExisted'))
    setNewName('')
    await join(data.id)
  }

  if (myTeamId === undefined) return null // avoid flicker while loading

  // Already on a team — show it; switching stays an admin action (no team-hopping).
  if (myTeamId) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-[#000000] mb-1">{t('prog.team.heading')}</h2>
        <p className="text-sm text-gray-700">
          {t('prog.team.onTeam', { team: myTeam ? myTeam.name : '—' })}
        </p>
        <p className="text-xs text-gray-400 mt-2">{t('prog.team.lockedNote')}</p>
      </div>
    )
  }

  // Flying solo — let them join or create a team now.
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-bold text-[#000000] mb-1">{t('prog.team.soloTitle')}</h2>
      <p className="text-sm text-gray-500 mb-4">{t('prog.team.soloSub')}</p>

      <input
        type="search"
        className={TEAM_FIELD_CLASS}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('cg.teamSearch')}
        aria-label={t('cg.teamSearch')}
      />

      <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">{t('cg.teamNone')}</p>
        ) : (
          filtered.map((tm) => (
            <div key={tm.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{tm.name}</p>
                <p className="text-xs text-gray-400">
                  {tm.members === 1 ? t('cg.teamMember') : t('cg.teamMembers', { count: tm.members })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => join(tm.id)}
                disabled={busy}
                className="shrink-0 text-xs bg-[#1C5E90] text-white font-bold px-4 py-1.5 rounded-lg hover:bg-[#164a73] transition-colors disabled:opacity-40"
              >
                {t('cg.teamJoin')}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-2">{t('cg.teamCreateTitle')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            className={TEAM_FIELD_CLASS}
            value={newName}
            onChange={(e) => { setNewName(e.target.value.slice(0, 40)); if (error) setError('') }}
            placeholder={t('cg.teamCreatePlaceholder')}
            maxLength={40}
            aria-label={t('cg.teamCreatePlaceholder')}
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || newName.trim().length < 2}
            className="shrink-0 bg-[#F1B82D] text-black font-bold px-4 rounded-lg hover:bg-[#d4a228] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {t('cg.teamCreate')}
          </button>
        </div>
        {error && <p role="alert" className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    </div>
  )
}

const CHALLENGE_START = new Date('2026-06-16T00:00:00')

function getWeekLabel(dateStr, weekWord) {
  const d = new Date(dateStr + 'T00:00:00')
  const diffMs = d - CHALLENGE_START
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNum = Math.floor(diffDays / 7) + 1
  return `${weekWord} ${weekNum}`
}

function buildWeeklyData(logs, weekWord) {
  const weeks = {}
  logs.forEach((l) => {
    const label = getWeekLabel(l.date, weekWord)
    if (!weeks[label]) weeks[label] = { week: label, miles: 0 }
    weeks[label].miles = parseFloat((weeks[label].miles + l.miles).toFixed(2))
  })
  return Object.values(weeks).sort((a, b) => {
    const numA = parseInt(a.week.split(' ')[1])
    const numB = parseInt(b.week.split(' ')[1])
    return numA - numB
  })
}

function calcStreak(logs) {
  if (!logs.length) return 0
  const dates = [...new Set(logs.map((l) => l.date))].sort()
  let streak = 1
  let maxStreak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00')
    const curr = new Date(dates[i] + 'T00:00:00')
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) { streak++; maxStreak = Math.max(maxStreak, streak) }
    else streak = 1
  }
  return maxStreak
}

function getMotivationalMessage(pct, t) {
  if (pct >= 100) return { text: t('prog.mot.100'), emoji: '🎉', color: 'text-green-600' }
  if (pct >= 75) return { text: t('prog.mot.75'), emoji: '🔥', color: 'text-orange-500' }
  if (pct >= 50) return { text: t('prog.mot.50'), emoji: '⚡', color: 'text-[#8B6914]' }
  if (pct >= 25) return { text: t('prog.mot.25'), emoji: '💪', color: 'text-blue-500' }
  return { text: t('prog.mot.0'), emoji: '👟', color: 'text-gray-600' }
}

const ACTIVITY_KEY = {
  Walking: 'act.walking', Running: 'act.running', Hiking: 'act.hiking',
  Biking: 'act.biking', Swimming: 'act.swimming', Dancing: 'act.dancing',
  'Strength Training': 'act.strength', Yoga: 'act.yoga',
  'Wheelchair Rolling': 'act.wheelchair', Gardening: 'act.gardening',
  Pickleball: 'act.pickleball', Basketball: 'act.basketball',
}

function ProgressContent() {
  const { t } = useI18n()
  const code = getCode()
  const displayName = getDisplayName()
  const county = getCounty()

  const [logs, setLogs] = useState([])
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (!code) return
    getMyActivityLogs(code).then(setLogs)
  }, [code])

  const totalMiles = parseFloat(logs.reduce((s, l) => s + l.miles, 0).toFixed(2))
  const milesLeft = Math.max(0, parseFloat((100 - totalMiles).toFixed(2)))
  const pct = Math.min(100, Math.round((totalMiles / 100) * 100))
  const daysActive = new Set(logs.map((l) => l.date)).size
  const streak = calcStreak(logs)
  const weeklyData = buildWeeklyData(logs, t('prog.weekShort') === 'prog.weekShort' ? 'Week' : t('prog.weekShort'))
  const motivation = getMotivationalMessage(pct, t)

  const progressBarColor =
    pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-[#F1B82D]' : 'bg-gray-400'

  const sortedLogs = [...logs].sort((a, b) =>
    sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  )

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#000000]">
              {t('prog.title', { name: displayName })}
            </h1>
            {county && <p className="text-gray-500 text-sm mt-1">{t('prog.county', { county })}</p>}
          </div>
          <Link
            to="/log"
            className="bg-[#F1B82D] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#d4a228] transition-colors text-sm self-start sm:self-auto"
          >
            {t('prog.logBtn')}
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('prog.totalMiles'), value: `${totalMiles} mi`, gold: true },
            { label: t('prog.goal'), value: '100 mi', gold: false },
            { label: t('prog.milesLeft'), value: `${milesLeft} mi`, gold: false },
            { label: t('prog.daysActive'), value: daysActive, gold: false },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-extrabold mb-1 ${s.gold ? 'text-[#8B6914]' : 'text-[#000000]'}`}>
                {s.value}
              </p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar + motivation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[#000000]">{t('prog.challengeProgress')}</h2>
            <span className={`text-sm font-bold ${motivation.color}`}>
              {motivation.emoji} {pct}%
            </span>
          </div>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressBarColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span>0 mi</span>
            <span>100 mi goal</span>
          </div>

          <p className={`text-sm font-semibold ${motivation.color}`}>{motivation.text}</p>

          {streak > 0 && (
            <div
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: 'rgba(241,184,45,0.15)', color: '#8B6914', border: '1px solid rgba(241,184,45,0.45)' }}
            >
              🔥 {t('prog.streak', { n: streak })}
            </div>
          )}
        </div>

        {/* Team — join later if you flew solo at sign-up */}
        <TeamCard code={code} />

        {/* Weekly chart */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#000000] mb-6">{t('prog.weekly')}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(v) => [`${v} mi`, t('prog.tableMiles')]}
                />
                <Bar dataKey="miles" fill="#F1B82D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Activity log table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#000000]">{t('prog.activityLog')}</h2>
            <button
              onClick={() => setSortAsc((a) => !a)}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              {t('prog.tableDate')} {sortAsc ? '↑' : '↓'}
            </button>
          </div>

          {sortedLogs.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-gray-400 text-sm mb-4">{t('prog.empty')}</p>
              <Link
                to="/log"
                className="bg-[#F1B82D] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#d4a228] transition-colors text-sm"
              >
                {t('prog.emptyBtn')}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableDate')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableActivity')}</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableMiles')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('prog.tableNotes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedLogs.map((log) => {
                    const actLabel = ACTIVITY_KEY[log.activity_type]
                      ? t(ACTIVITY_KEY[log.activity_type])
                      : log.activity_type
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{log.date}</td>
                        <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{actLabel}</td>
                        <td className="px-6 py-3 text-right font-bold text-[#8B6914] whitespace-nowrap">{log.miles} mi</td>
                        <td className="px-6 py-3 text-gray-400 hidden sm:table-cell">{log.notes || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/log"
            className="inline-block bg-[#F1B82D] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
          >
            {t('prog.logMore')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Progress() {
  return (
    <CodeGate>
      <ProgressContent />
    </CodeGate>
  )
}
