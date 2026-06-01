import { useEffect, useState } from 'react'
import { getAnnouncement } from '../lib/db'
import { isAnnouncementDismissed, dismissAnnouncement } from '../lib/announcement'
import { useI18n } from '../lib/i18n'

export default function AnnouncementBanner() {
  const { t } = useI18n()
  const [state, setState] = useState({ text: '', dismissed: true })

  useEffect(() => {
    let cancelled = false
    getAnnouncement().then(({ text, updated }) => {
      if (cancelled) return
      // Remember the updated timestamp so dismissal is per-publish
      if (updated) localStorage.setItem('site_announcement_updated', updated)
      setState({ text, dismissed: isAnnouncementDismissed() })
    })
    return () => { cancelled = true }
  }, [])

  if (!state.text || state.dismissed) return null

  function handleDismiss() {
    dismissAnnouncement()
    setState((s) => ({ ...s, dismissed: true }))
  }

  return (
    <div role="status" aria-live="polite" className="bg-[#1C5E90] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <p className="text-sm font-medium flex-1">{state.text}</p>
        <button
          onClick={handleDismiss}
          aria-label={t('a11y.dismissAnnouncement')}
          className="flex-shrink-0 p-1 rounded hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
