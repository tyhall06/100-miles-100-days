import { useEffect } from 'react'
import { useI18n } from '../lib/i18n'

// Keeps <html lang="..."> in sync with the i18n language toggle.
// Critical for screen readers and assistive tech.
export default function LangSync() {
  const { lang } = useI18n()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return null
}
