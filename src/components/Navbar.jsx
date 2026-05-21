import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { getDisplayName } from '../lib/storage'
import { useI18n } from '../lib/i18n'
import LanguageToggle from './LanguageToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [displayName, setDisplayName] = useState(null)
  const location = useLocation()
  const { t } = useI18n()

  useEffect(() => {
    setDisplayName(getDisplayName())
  }, [location])

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/leaderboard', label: t('nav.leaderboard') },
    { to: '/resources', label: t('nav.resources') },
    { to: '/community', label: t('nav.community') },
  ]

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 ${
      isActive ? 'text-[#F1B82D]' : 'text-gray-300 hover:text-white'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-[#1A1A1A] shadow-lg">
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
              <span className="text-gray-400 text-sm">
                {t('nav.greeting')} <span className="text-white font-semibold">{displayName}</span>!
              </span>
            )}
            <LanguageToggle />
            <Link
              to="/log"
              className="bg-[#F1B82D] text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#d4a228] transition-colors duration-150"
            >
              {t('nav.logMiles')}
            </Link>
          </div>

          {/* Mobile: name + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <LanguageToggle />
            {displayName && (
              <span className="text-gray-400 text-xs">
                Hi, <span className="text-white font-semibold">{displayName}</span>!
              </span>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="text-gray-300 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#111111] border-t border-gray-800 px-4 pb-4 pt-2 flex flex-col gap-3">
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
            {t('nav.logMiles')}
          </Link>
        </div>
      )}
    </nav>
  )
}
