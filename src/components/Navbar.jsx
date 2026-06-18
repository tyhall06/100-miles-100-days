import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getDisplayName, clearParticipant } from '../lib/storage'
import { useI18n } from '../lib/i18n'
import LanguageToggle from './LanguageToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [displayName, setDisplayName] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    setDisplayName(getDisplayName())
  }, [location])

  function handleSignOut() {
    if (!window.confirm(t('nav.signOutConfirm'))) return
    clearParticipant()
    setDisplayName(null)
    setMenuOpen(false)
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: t('nav.home') },
    // Shown once the person has entered their code (registered on this device).
    ...(displayName ? [{ to: '/progress', label: t('nav.myProgress') }] : []),
    { to: '/leaderboard', label: t('nav.leaderboard') },
    { to: '/resources', label: t('nav.resources') },
    { to: '/community', label: t('nav.community') },
  ]

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 ${
      isActive ? 'text-[#F1B82D]' : 'text-gray-300 hover:text-white'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-[#000000] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src="/2024logo.png"
              alt="100 Miles, 100 Days"
              className="h-10"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            {displayName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">
                  {t('nav.greeting')} <span className="text-white font-semibold">{displayName}</span>!
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-gray-400 hover:text-white underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#F1B82D] rounded px-1"
                >
                  {t('nav.signOut')}
                </button>
              </div>
            )}
            <LanguageToggle />
            <Link
              to="/log"
              className="bg-[#F1B82D] text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#d4a228] transition-colors duration-150"
            >
              {displayName ? t('nav.logMiles') : t('nav.enterCode')}
            </Link>
          </div>

          {/* Mobile: name + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <LanguageToggle />
            {displayName && (
              <span className="text-gray-400 text-xs">
                {t('nav.greeting')} <span className="text-white font-semibold">{displayName}</span>!
              </span>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="text-gray-300 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
              aria-label={t('a11y.menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div id="mobile-nav" className="md:hidden bg-[#111111] border-t border-gray-800 px-4 pb-4 pt-2 flex flex-col gap-3">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/log"
            onClick={() => setMenuOpen(false)}
            className="bg-[#F1B82D] text-black text-sm font-bold px-4 py-2 rounded-xl text-center hover:bg-[#d4a228] transition-colors duration-150 mt-1"
          >
            {displayName ? t('nav.logMiles') : t('nav.enterCode')}
          </Link>
          {displayName && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-400 hover:text-white text-center py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
            >
              {t('nav.signOut')}
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
