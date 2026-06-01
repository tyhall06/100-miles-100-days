import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CodeGate from '../components/CodeGate'
import MilestoneModal from '../components/MilestoneModal'
import { getCode, getDisplayName } from '../lib/storage'
import { insertActivityLog, getMyActivityLogs } from '../lib/db'
import { findNewMilestone, markCelebrated } from '../lib/milestones'
import { useI18n } from '../lib/i18n'
import {
  ACTIVITY_TYPES, MINUTES_PER_MILE, STEPS_PER_MILE, MAX_MILES_PER_ENTRY,
} from '../lib/mockData'

const FIELD_CLASS =
  'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D] transition-colors'
const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 mb-1'

// Map English activity name → translation key (so dropdown values stay stable)
const ACTIVITY_KEY = {
  Walking: 'act.walking',
  Running: 'act.running',
  Hiking: 'act.hiking',
  Biking: 'act.biking',
  Swimming: 'act.swimming',
  Dancing: 'act.dancing',
  'Strength Training': 'act.strength',
  Yoga: 'act.yoga',
  'Wheelchair Rolling': 'act.wheelchair',
  Gardening: 'act.gardening',
  Pickleball: 'act.pickleball',
  Basketball: 'act.basketball',
  Other: 'act.other',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function genLogId() {
  return 'local-' + Math.random().toString(36).slice(2, 10)
}

function calcMiles(value) {
  if (!value || isNaN(value) || Number(value) <= 0) return 0
  return parseFloat(Number(value).toFixed(2))
}

function LogContent() {
  const { t } = useI18n()
  const displayName = getDisplayName()

  const [form, setForm] = useState({
    date: todayStr(),
    activityType: 'Walking',
    value: '',
    notes: '',
  })
  const [livePreview, setLivePreview] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [lastLog, setLastLog] = useState(null)
  const [totalMiles, setTotalMiles] = useState(0)
  const [milestoneThreshold, setMilestoneThreshold] = useState(null)
  const [showHelper, setShowHelper] = useState(false)

  useEffect(() => {
    const code = getCode()
    if (!code) return
    getMyActivityLogs(code).then((logs) => {
      const total = logs.reduce((s, l) => s + Number(l.miles), 0)
      setTotalMiles(parseFloat(total.toFixed(2)))
    })
  }, [submitted])

  useEffect(() => {
    setLivePreview(calcMiles(form.value))
  }, [form.value])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const miles = calcMiles(form.value)
    if (!form.value || miles <= 0 || miles > MAX_MILES_PER_ENTRY) return

    const log = {
      id: genLogId(),
      date: form.date,
      activity_type: form.activityType,
      miles,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    }

    const priorTotal = totalMiles
    const newTotal = parseFloat((priorTotal + miles).toFixed(2))
    const code = getCode()
    const crossed = findNewMilestone(code, priorTotal, newTotal)

    await insertActivityLog(code, log)
    setLastLog(log)
    setSubmitted(true)
    if (crossed) {
      markCelebrated(code, crossed)
      setMilestoneThreshold(crossed)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLogAnother() {
    setForm({ date: todayStr(), activityType: 'Walking', value: '', notes: '' })
    setLivePreview(0)
    setSubmitted(false)
    setLastLog(null)
  }

  const overCap = livePreview > MAX_MILES_PER_ENTRY
  const encIdx = (Math.floor(Math.random() * 8) + 1)
  const encourage = t(`log.enc.${encIdx}`)

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (submitted && lastLog) {
    const postTotal = parseFloat((totalMiles).toFixed(2))
    const pct = Math.min(100, Math.round((postTotal / 100) * 100))
    const lastActLabel = ACTIVITY_KEY[lastLog.activity_type]
      ? t(ACTIVITY_KEY[lastLog.activity_type])
      : lastLog.activity_type
    return (
      <>
      <MilestoneModal threshold={milestoneThreshold} onClose={() => setMilestoneThreshold(null)} />
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#F1B82D] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-[#000000] mb-1">{t('log.confirm.title')}</h2>
          <p className="text-gray-500 text-sm mb-6">{encourage}</p>

          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('log.confirm.activity')}</span>
              <span className="font-semibold text-gray-900">{lastActLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('log.confirm.date')}</span>
              <span className="font-semibold text-gray-900">{lastLog.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('log.confirm.added')}</span>
              <span className="font-bold text-[#8B6914] text-lg">+{lastLog.miles}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
              <span className="text-gray-500">{t('log.confirm.newTotal')}</span>
              <span className="font-extrabold text-[#000000] text-lg">{postTotal} mi</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('log.confirm.progressTo')}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  postTotal >= 100 ? 'bg-green-500' : 'bg-[#F1B82D]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogAnother}
              className="bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
            >
              {t('log.confirm.logAnother')}
            </button>
            <Link
              to="/progress"
              className="border-2 border-[#000000] text-[#000000] font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {t('log.confirm.viewProgress')}
            </Link>
          </div>
        </div>
      </div>
      </>
    )
  }

  // ── Log form ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            {t('log.heading')}
          </span>
          <h1 className="text-3xl font-extrabold text-[#000000] mb-1">
            {t('log.hi')} {displayName || t('log.there')}!
          </h1>
          <p className="text-gray-500 text-sm">
            {t('log.currentTotal')}{' '}
            <span className="font-bold text-[#000000] text-base">{totalMiles} {t('log.miles')}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <label htmlFor="log-date" className={LABEL_CLASS}>
              {t('log.date')} <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="log-date"
              type="date"
              className={FIELD_CLASS}
              value={form.date}
              min="2026-06-16"
              max="2026-09-24"
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="log-activity" className={LABEL_CLASS}>
              {t('log.activityType')} <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <select
              id="log-activity"
              className={FIELD_CLASS}
              value={form.activityType}
              onChange={(e) => { set('activityType', e.target.value); set('value', '') }}
              required
            >
              {ACTIVITY_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_KEY[a] ? t(ACTIVITY_KEY[a]) : a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="log-miles" className={LABEL_CLASS}>
              {t('log.milesLabel')} <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="log-miles"
              type="number"
              min="0"
              step="0.01"
              className={FIELD_CLASS}
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              placeholder={t('log.milesPlaceholder')}
              aria-describedby="log-miles-hint"
              required
            />
            <p id="log-miles-hint" className="text-xs text-gray-400 mt-1">{t('log.notSure')}</p>
          </div>

          {overCap && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
              <strong>{t('log.overCapTitle')}</strong>{' '}
              {t('log.overCapBody', { max: MAX_MILES_PER_ENTRY })}
            </div>
          )}

          {form.value && livePreview > 0 && !overCap && (
            <div className="bg-[#F1B82D]/10 border border-[#F1B82D] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F1B82D] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black font-extrabold text-sm">+</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#000000]">
                  {t('log.thisCountsAs')}{' '}
                  <span className="text-[#8B6914] text-lg">{livePreview}</span>{' '}
                  {t('log.milesTowardGoal')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('log.newTotalWillBe', { n: parseFloat((totalMiles + livePreview).toFixed(2)) })}
                </p>
              </div>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHelper((v) => !v)}
              aria-expanded={showHelper}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-[#000000] flex items-center gap-2">
                <span aria-hidden="true">❓</span> {t('log.whatCounts')}
              </span>
              <span className={`text-gray-400 transition-transform ${showHelper ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showHelper && (
              <div className="px-4 py-4 text-sm text-gray-700 space-y-4">
                <p className="text-gray-600">{t('log.whatCountsBody')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#F1B82D]/10 border border-[#F1B82D] rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-[#8B6914]">
                      {t('log.minutesBox', { n: MINUTES_PER_MILE })}
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{t('log.equalsOneMile')}</p>
                    <p className="text-xs text-gray-500 mt-2">{t('log.minutesExample')}</p>
                  </div>
                  <div className="bg-[#1C5E90]/10 border border-[#1C5E90] rounded-xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-[#1C5E90]">
                      {t('log.stepsBox', { n: STEPS_PER_MILE.toLocaleString() })}
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{t('log.equalsOneMile')}</p>
                    <p className="text-xs text-gray-500 mt-2">{t('log.stepsExample')}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {t('log.maxNote', { max: MAX_MILES_PER_ENTRY })}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="log-notes" className={LABEL_CLASS}>
              {t('log.notes')} <span className="text-gray-400 font-normal">{t('log.optional')}</span>
            </label>
            <input
              id="log-notes"
              type="text"
              className={FIELD_CLASS}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder={t('log.notesPlaceholder')}
              maxLength={200}
              aria-describedby="log-notes-counter"
            />
            <p id="log-notes-counter" className="text-xs text-gray-400 mt-1">{form.notes.length}/200</p>
          </div>

          <button
            type="submit"
            disabled={!form.value || livePreview <= 0 || overCap}
            className="w-full bg-[#F1B82D] text-black font-bold text-base py-4 rounded-xl hover:bg-[#d4a228] transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {livePreview > 0 && !overCap
              ? t('log.logNMiles', { n: livePreview })
              : t('log.logActivity')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Log() {
  return (
    <CodeGate>
      <LogContent />
    </CodeGate>
  )
}
