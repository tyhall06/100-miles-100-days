import { useEffect, useRef } from 'react'
import { useI18n } from '../lib/i18n'

const EMOJIS = { 10: '🌱', 25: '⚡', 50: '🔥', 75: '💪', 100: '🏆' }

export default function MilestoneModal({ threshold, onClose }) {
  const { t } = useI18n()
  const closeBtnRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Focus management: focus the close button on open, restore focus on close
  useEffect(() => {
    if (!threshold) return
    previousFocusRef.current = document.activeElement
    closeBtnRef.current?.focus()

    // Trap focus inside dialog + Escape to close
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab') {
        // Only one focusable element — keep focus on it
        e.preventDefault()
        closeBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previousFocusRef.current?.focus?.()
    }
  }, [threshold, onClose])

  if (!threshold) return null
  const emoji = EMOJIS[threshold] || EMOJIS[10]
  const title = t(`ms.${threshold}.title`)
  const sub = t(`ms.${threshold}.sub`)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
      aria-describedby="milestone-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-[#F1B82D] flex items-center justify-center text-4xl shadow-xl border-4 border-white" aria-hidden="true">
            {emoji}
          </div>
        </div>

        <div className="pt-10">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            {t('ms.unlocked')}
          </span>
          <h2 id="milestone-title" className="text-3xl font-extrabold text-[#000000] mb-2">{title}</h2>
          <p id="milestone-desc" className="text-gray-600 text-sm mb-6">{sub}</p>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="w-full bg-[#000000] text-white font-bold py-3 rounded-xl hover:bg-black focus:outline-none focus:ring-4 focus:ring-[#F1B82D]/50 transition-colors"
          >
            {t('ms.keepGoing')}
          </button>
        </div>
      </div>
    </div>
  )
}
