import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStatsStatewide } from '../lib/db'
import { useI18n } from '../lib/i18n'

const ACTIVITY_CARDS = [
  { icon: '🚶', key: 'act.walking' },
  { icon: '🏃', key: 'act.running' },
  { icon: '🥾', key: 'act.hiking' },
  { icon: '🚴', key: 'act.biking' },
  { icon: '🏊', key: 'act.swimming' },
  { icon: '💃', key: 'act.dancing' },
  { icon: '🏋️', key: 'act.strength' },
  { icon: '🧘', key: 'act.yoga' },
  { icon: '🏓', key: 'act.pickleball' },
  { icon: '🏀', key: 'act.basketball' },
  { icon: '🌱', key: 'act.gardening' },
  { icon: '♿', key: 'act.wheelchair' },
]

const HOW_IT_WORKS = [
  { num: '1', titleKey: 'home.step1Title', descKey: 'home.step1Desc' },
  { num: '2', titleKey: 'home.step2Title', descKey: 'home.step2Desc' },
  { num: '3', titleKey: 'home.step3Title', descKey: 'home.step3Desc' },
]

export default function Home() {
  const { t } = useI18n()
  const [stats, setStats] = useState({ totalParticipants: 0, totalMiles: 0, daysRemaining: 100 })

  useEffect(() => {
    getStatsStatewide().then(setStats).catch((e) => console.error('home stats:', e))
  }, [])

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-[#000000] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1C5E90]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="flex justify-center mb-8">
            <img
              src="/2024logo.png"
              alt="100 Miles, 100 Days"
              className="w-full max-w-xs sm:max-w-sm md:max-w-md drop-shadow-2xl"
            />
          </div>

          <p className="text-xl sm:text-2xl text-gray-300 mb-3 max-w-2xl mx-auto">
            {t('home.tagline')}
          </p>
          <p className="text-gray-400 text-base mb-10">
            {t('home.dates')} &nbsp;&middot;&nbsp; {t('home.openTo')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/log"
              className="bg-[#F1B82D] text-black font-bold text-lg px-8 py-4 rounded-xl hover:bg-[#d4a228] transition-colors shadow-lg"
            >
              {t('home.logYourMiles')}
            </Link>
            <Link
              to="/leaderboard"
              className="text-[#1C5E90] font-semibold text-base border border-[#1C5E90] px-6 py-4 rounded-xl hover:bg-[#1C5E90]/10 transition-colors"
            >
              {t('home.viewLeaderboard')}
            </Link>
          </div>

          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 mt-8 text-xs text-gray-400 hover:text-[#1C5E90] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t('home.privacyBadge')}
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-10 fill-gray-50">
            <path d="M0,60 C300,0 900,0 1200,60 L1200,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: t('home.totalParticipants'), value: stats.totalParticipants.toLocaleString(), sub: t('home.andCounting') },
              { label: t('home.totalMiles'), value: stats.totalMiles.toLocaleString(), sub: t('home.loggedStatewide') },
              { label: t('home.daysRemaining'), value: stats.daysRemaining, sub: t('home.untilSept22') },
            ].map((s) => (
              <div key={s.label} className="bg-[#000000] rounded-2xl p-8 text-center shadow-lg">
                <p className="text-4xl font-extrabold text-[#F1B82D] mb-1">{s.value}</p>
                <p className="text-white font-semibold text-sm mb-1">{s.label}</p>
                <p className="text-gray-500 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#000000] mb-3">{t('home.howItWorks')}</h2>
            <p className="text-gray-500 text-lg">{t('home.howItWorksSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-[#F1B82D] flex items-center justify-center text-black font-extrabold text-2xl mb-5 shadow-md">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-[#000000] mb-3">{t(step.titleKey)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Any Movement Counts ──────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-[#000000] mb-2">{t('home.anyMovement')}</h2>
            <p className="text-gray-500">{t('home.anyMovementSub')}</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {ACTIVITY_CARDS.map((a) => (
              <div
                key={a.key}
                className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100 hover:border-[#F1B82D] hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-2">{a.icon}</div>
                <p className="text-xs font-semibold text-gray-600 leading-tight">{t(a.key)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About / Quote ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#000000]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <img
                src="/2026flyer.jpg"
                alt="100 Miles, 100 Days 2026 program flyer — join the challenge June 16 through September 24, 2026"
                className="w-48 sm:w-56 rounded-xl shadow-2xl opacity-80 border border-gray-700"
              />
            </div>

            <div className="text-center md:text-left flex-1">
              <blockquote className="text-white text-xl sm:text-2xl font-light italic leading-relaxed mb-4 pl-6 border-l-4 border-[#F1B82D]">
                {t('home.quote')}
              </blockquote>
              <cite className="text-gray-400 text-sm not-italic">— Hippocrates</cite>

              <div className="mt-10 border-t border-gray-800 pt-8">
                <p className="text-gray-400 text-base mb-5">
                  {t('home.readyStart')}
                </p>
                <Link
                  to="/log"
                  className="inline-block bg-[#F1B82D] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
                >
                  {t('home.logFirstMiles')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Instagram / Community ────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-[#000000] mb-3">{t('home.followMovement')}</h2>
          <p className="text-gray-500 text-base mb-2">{t('home.followSub')}</p>

          {/* Placeholder grid — PRODUCTION: Replace with Curator.io or Juicer.io embed script */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-8 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">{t('home.feedSoon')}</p>
        </div>
      </section>
    </div>
  )
}
