import { useState } from 'react'
import { useI18n } from '../lib/i18n'

// Post-challenge survey CTA. Shown site-wide; dismissible per device.
// Update SURVEY_URL if the survey link ever changes.
const SURVEY_URL = 'https://missouri.qualtrics.com/jfe/form/SV_4ZsPv6tk8OsEYXI'
const DISMISS_KEY = 'survey_banner_dismissed_2026'

export default function SurveyBanner() {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  if (dismissed) return null

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div role="region" aria-label={t('survey.aria')} className="bg-[#F1B82D] text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden="true" className="text-xl">🏁</span>
        <p className="text-sm font-semibold flex-1 min-w-[12rem]">{t('survey.msg')}</p>
        <a
          href={SURVEY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-black text-[#F1B82D] font-bold text-sm px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {t('survey.btn')}
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('survey.dismiss')}
          className="shrink-0 p-1 rounded hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
