import { useI18n } from '../lib/i18n'

export default function LanguageToggle() {
  const { lang, setLang } = useI18n()

  const btn = (code, label) =>
    `px-2 py-1 text-xs font-bold rounded transition-colors ${
      lang === code
        ? 'bg-[#F1B82D] text-black'
        : 'text-gray-300 hover:text-white'
    }`

  return (
    <div className="inline-flex items-center gap-1 border border-gray-700 rounded-lg p-0.5" role="group" aria-label="Language">
      <button type="button" className={btn('en')} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
      <button type="button" className={btn('es')} onClick={() => setLang('es')} aria-pressed={lang === 'es'}>ES</button>
    </div>
  )
}
