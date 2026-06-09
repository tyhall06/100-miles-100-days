import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="bg-[#000000] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-[#F1B82D] font-extrabold text-base mb-1">100 Miles, 100 Days</p>
            <p className="text-sm text-gray-500">{t('footer.dates')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('footer.tagline')}</p>
          </div>

          <div>
            <p className="text-white font-semibold text-sm mb-3">{t('footer.quickLinks')}</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link></li>
              <li><Link to="/log" className="hover:text-white transition-colors">{t('nav.logMiles')}</Link></li>
              <li><Link to="/leaderboard" className="hover:text-white transition-colors">{t('nav.leaderboard')}</Link></li>
              <li><Link to="/resources" className="hover:text-white transition-colors">{t('nav.resources')}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-white font-semibold text-sm mb-3">{t('footer.contact')}</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <a href="https://extension.missouri.edu" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {t('footer.muext')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500 space-y-2">
          <p>
            MU Extension | University of Missouri | 100 Miles, 100 Days | {t('footer.dates')}
          </p>
          <p>{t('footer.eo')}</p>
          <p>{t('footer.copyright')}</p>
          <p className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
            <a href="https://missouri.edu/marks-identity-content" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
              {t('footer.marks')}
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://missouri.edu/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
              {t('footer.dmca')}
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://missouri.edu/digital-accessibility" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
              {t('footer.accessibility')}
            </a>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="hover:text-white transition-colors underline">
              {t('footer.privacyPolicy')}
            </Link>
          </p>
          <p>
            <a href="https://missouri.edu/feedback" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
              {t('footer.feedback')}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
