import { useI18n } from '../lib/i18n'

// Keyboard-only users can press Tab once on any page to reveal this link
// and jump straight to the main content, skipping the nav.
export default function SkipLink() {
  const { t } = useI18n()
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#F1B82D] focus:text-black focus:font-bold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-black"
    >
      {t('a11y.skip')}
    </a>
  )
}
