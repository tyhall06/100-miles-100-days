import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import CodeGate from '../components/CodeGate'
import { getCode, getDisplayName, getCounty } from '../lib/storage'
import { getMyActivityLogs } from '../lib/db'
import { useI18n } from '../lib/i18n'

const CHALLENGE_START = new Date('2026-06-15T00:00:00')

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
            <h1 className="text-3xl font-extrabold text-[#1A1A1A]">
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
              <p className={`text-2xl font-extrabold mb-1 ${s.gold ? 'text-[#8B6914]' : 'text-[#1A1A1A]'}`}>
                {s.value}
              </p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar + motivation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[#1A1A1A]">{t('prog.challengeProgress')}</h2>
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
              style={{ background: 'rgba(75,184,196,0.12)', color: '#4BB8C4', border: '1px solid rgba(75,184,196,0.3)' }}
            >
              🔥 {t('prog.streak', { n: streak })}
            </div>
          )}
        </div>

        {/* Weekly chart */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1A1A1A] mb-6">{t('prog.weekly')}</h2>
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
            <h2 className="font-bold text-[#1A1A1A]">{t('prog.activityLog')}</h2>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableDate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableActivity')}</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('prog.tableMiles')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('prog.tableNotes')}</th>
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
