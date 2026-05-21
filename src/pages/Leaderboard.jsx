import { useState, useEffect, useMemo } from 'react'
import { getLeaderboard, getCountyStats, getStatsStatewide } from '../lib/db'
import { useI18n } from '../lib/i18n'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function rankStyle(rank) {
  if (rank === 1) return 'bg-yellow-50 text-yellow-700 font-extrabold'
  if (rank === 2) return 'bg-gray-50 text-gray-600 font-extrabold'
  if (rank === 3) return 'bg-orange-50 text-orange-700 font-extrabold'
  return ''
}

export default function Leaderboard() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('individual')
  const [search, setSearch] = useState('')

  const [stats, setStats] = useState({ totalParticipants: 0, totalMiles: 0, daysRemaining: 0 })
  const [leaderboard, setLeaderboard] = useState([])
  const [countyStats, setCountyStats] = useState([])

  useEffect(() => {
    Promise.all([getStatsStatewide(), getLeaderboard(), getCountyStats()])
      .then(([s, lb, cs]) => { setStats(s); setLeaderboard(lb); setCountyStats(cs) })
  }, [])

  const mostActiveCounty = countyStats[0]?.county || '—'

  // Rivalry banner: gap between top two counties
  const rivalry = useMemo(() => {
    if (countyStats.length < 2) return null
    const [first, second] = countyStats
    const gap = parseFloat((first.totalMiles - second.totalMiles).toFixed(1))
    if (gap <= 0) return null
    return { leader: first.county, chaser: second.county, gap }
  }, [countyStats])

  const filteredIndividuals = useMemo(() => {
    const q = search.toLowerCase()
    return leaderboard.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q)
    )
  }, [search, leaderboard])

  const filteredCounties = useMemo(() => {
    const q = search.toLowerCase()
    return countyStats.filter((c) => c.county.toLowerCase().includes(q))
  }, [search, countyStats])

  const tabClass = (tab) =>
    `px-5 py-2.5 text-sm font-bold transition-colors ${
      activeTab === tab
        ? 'text-[#4BB8C4] border-b-2 border-[#4BB8C4]'
        : 'text-gray-500 hover:text-gray-800 border-b-2 border-transparent'
    }`

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            Community Progress
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mb-2">{t('lb.heading')}</h1>
          <p className="text-gray-500 text-sm">{t('lb.sub')}</p>
        </div>

        {/* Rivalry banner */}
        {rivalry && (
          <div className="bg-gradient-to-r from-[#4BB8C4] to-[#1A1A1A] rounded-2xl p-5 text-white shadow-md flex items-center gap-4">
            <div className="text-3xl" aria-hidden="true">⚔️</div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#F1B82D] mb-1">
                {t('lb.rivalryLabel')}
              </p>
              <p className="text-sm sm:text-base">
                {t('lb.rivalryBody', { chaser: rivalry.chaser, gap: rivalry.gap, leader: rivalry.leader })}
              </p>
            </div>
          </div>
        )}

        {/* Statewide summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: t('lb.cardParticipants'), value: stats.totalParticipants.toLocaleString() },
            { label: t('lb.cardMiles'), value: stats.totalMiles.toLocaleString() + ' mi' },
            { label: t('lb.cardActiveCounty'), value: mostActiveCounty },
          ].map((s) => (
            <div key={s.label} className="bg-[#1A1A1A] rounded-2xl p-6 text-center shadow-md">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#F1B82D] mb-1">{s.value}</p>
              <p className="text-gray-400 text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Card with tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6">
            <div className="flex gap-1">
              <button
                className={tabClass('individual')}
                onClick={() => { setActiveTab('individual'); setSearch('') }}
              >
                {t('lb.individual')}
              </button>
              <button
                className={tabClass('county')}
                onClick={() => { setActiveTab('county'); setSearch('') }}
              >
                {t('lb.byCounty')}
              </button>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              {t('lb.updatedNote')}
            </p>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'individual' ? t('lb.searchInd') : t('lb.searchCounty')}
              className="w-full sm:max-w-xs border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
            />
          </div>

          {/* Individual tab */}
          {activeTab === 'individual' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('lb.tableName')}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('lb.tableCounty')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('lb.tableMiles')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredIndividuals.map((p) => {
                    const rank = leaderboard.indexOf(p) + 1
                    return (
                      <tr key={p.code} className={`hover:bg-gray-50 transition-colors ${rankStyle(rank)}`}>
                        <td className="px-5 py-3 text-center">
                          {MEDAL[rank] || <span className="text-gray-400">{rank}</span>}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900">{p.display_name}</td>
                        <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{p.county}</td>
                        <td className="px-5 py-3 text-right font-extrabold text-[#8B6914]">{p.totalMiles} mi</td>
                      </tr>
                    )
                  })}
                  {filteredIndividuals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">{t('lb.empty')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* County tab */}
          {activeTab === 'county' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('lb.tableCounty')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('lb.tableParticipants')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('lb.tableTotal')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('lb.tableAvg')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCounties.map((c) => {
                    const rank = countyStats.indexOf(c) + 1
                    return (
                      <tr key={c.county} className={`hover:bg-gray-50 transition-colors ${rankStyle(rank)}`}>
                        <td className="px-5 py-3 text-center">
                          {MEDAL[rank] || <span className="text-gray-400">{rank}</span>}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900">{c.county}</td>
                        <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">{c.participants}</td>
                        <td className="px-5 py-3 text-right font-extrabold text-[#8B6914]">{c.totalMiles} mi</td>
                        <td className="px-5 py-3 text-right text-gray-500 hidden md:table-cell">{c.avgMiles} mi</td>
                      </tr>
                    )
                  })}
                  {filteredCounties.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('lb.empty')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          {t('lb.updatedNote')}.
        </p>
      </div>
    </div>
  )
}
