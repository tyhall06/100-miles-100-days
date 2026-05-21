import { useState } from 'react'
import { getCode, getDisplayName, saveParticipant } from '../lib/storage'
import { validateCode, upsertParticipantProfile } from '../lib/db'
import { isProfane } from '../lib/filter'
import { useI18n } from '../lib/i18n'

const ALL_MO_COUNTIES = [
  'Adair', 'Andrew', 'Atchison', 'Audrain', 'Barry', 'Barton', 'Bates', 'Benton',
  'Bollinger', 'Boone', 'Buchanan', 'Butler', 'Caldwell', 'Callaway', 'Camden',
  'Cape Girardeau', 'Carroll', 'Carter', 'Cass', 'Cedar', 'Chariton', 'Christian',
  'Clark', 'Clay', 'Clinton', 'Cole', 'Cooper', 'Crawford', 'Dade', 'Dallas',
  'Daviess', 'DeKalb', 'Dent', 'Douglas', 'Dunklin', 'Franklin', 'Gasconade',
  'Gentry', 'Greene', 'Grundy', 'Harrison', 'Henry', 'Hickory', 'Holt', 'Howard',
  'Howell', 'Iron', 'Jackson', 'Jasper', 'Jefferson', 'Johnson', 'Knox', 'Laclede',
  'Lafayette', 'Lawrence', 'Lewis', 'Lincoln', 'Linn', 'Livingston', 'McDonald',
  'Macon', 'Madison', 'Maries', 'Marion', 'Mercer', 'Miller', 'Mississippi',
  'Moniteau', 'Monroe', 'Montgomery', 'Morgan', 'New Madrid', 'Newton', 'Nodaway',
  'Oregon', 'Osage', 'Ozark', 'Pemiscot', 'Perry', 'Pettis', 'Phelps', 'Pike',
  'Platte', 'Polk', 'Pulaski', 'Putnam', 'Ralls', 'Randolph', 'Ray', 'Reynolds',
  'Ripley', 'St. Charles', 'St. Clair', 'Ste. Genevieve', 'St. Francois', 'St. Louis',
  'St. Louis City', 'Saline', 'Schuyler', 'Scotland', 'Scott', 'Shannon', 'Shelby',
  'Stoddard', 'Stone', 'Sullivan', 'Taney', 'Texas', 'Vernon', 'Warren', 'Washington',
  'Wayne', 'Webster', 'Worth', 'Wright',
]

const FIELD_CLASS =
  'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D] transition-colors'

const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 mb-1'

export default function CodeGate({ children }) {
  const { t } = useI18n()
  const [step, setStep] = useState(() => {
    const code = getCode()
    if (!code) return 'code'
    if (!getDisplayName()) return 'profile'
    return 'done'
  })

  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')

  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [countyInput, setCountyInput] = useState('')
  const [countyError, setCountyError] = useState('')

  // Validated code stored during this session before profile is saved
  const [validatedCode, setValidatedCode] = useState(getCode() || '')

  async function handleCodeSubmit(e) {
    e.preventDefault()
    const trimmed = codeInput.trim()

    if (!/^\d{4}$/.test(trimmed)) {
      setCodeError(t('cg.errInvalid'))
      return
    }

    const participant = await validateCode(trimmed)
    if (!participant) {
      setCodeError(t('cg.errNotFound'))
      return
    }

    setValidatedCode(trimmed)

    if (participant.display_name) {
      saveParticipant(trimmed, participant.display_name, participant.county)
      setStep('done')
    } else {
      saveParticipant(trimmed, '', '')
      setStep('profile')
    }
  }

  function handleNameInput(val) {
    // Alphanumeric only, no spaces
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
    setNameInput(cleaned)
    if (nameError) setNameError('')
  }

  async function handleProfileSubmit(e) {
    e.preventDefault()

    if (!nameInput.trim()) {
      setNameError(t('cg.errName'))
      return
    }
    if (nameInput.length < 2) {
      setNameError(t('cg.errName2'))
      return
    }
    if (isProfane(nameInput)) {
      setNameError(t('cg.errProfane'))
      return
    }
    if (!countyInput) {
      setCountyError(t('cg.errCounty'))
      return
    }

    saveParticipant(validatedCode, nameInput, countyInput)
    await upsertParticipantProfile(validatedCode, nameInput, countyInput)
    setStep('done')
  }

  if (step === 'done') {
    return <>{children}</>
  }

  // ── Step 1: Enter 4-digit code ─────────────────────────────────────────────
  if (step === 'code') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#F1B82D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">{t('cg.codeTitle')}</h1>
            <p className="text-gray-500 text-sm">{t('cg.codeSub')}</p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>{t('cg.codeLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                className={`${FIELD_CLASS} text-center text-3xl font-extrabold tracking-[0.5em]`}
                value={codeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setCodeInput(val)
                  setCodeError('')
                }}
                placeholder="0000"
                autoFocus
              />
              {codeError && (
                <p className="text-red-500 text-xs mt-2">{codeError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
            >
              {t('cg.codeEnter')}
            </button>

            <p className="text-center text-xs text-gray-400 mt-2">
              {t('cg.codeHint')}
            </p>
          </form>
        </div>
      </div>
    )
  }

  // ── Step 2: Choose display name + county ───────────────────────────────────
  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#4BB8C4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">{t('cg.welcome')}</h1>
          <p className="text-gray-500 text-sm">{t('cg.welcomeSub')}</p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          {/* Display name */}
          <div>
            <label className={LABEL_CLASS}>
              {t('cg.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={FIELD_CLASS}
              value={nameInput}
              onChange={(e) => handleNameInput(e.target.value)}
              placeholder={t('cg.namePlaceholder')}
              maxLength={20}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('cg.nameHint')}
              {nameInput.length > 0 && (
                <span className="ml-2 text-gray-500">{nameInput.length}/20</span>
              )}
            </p>
            {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
          </div>

          {/* County */}
          <div>
            <label className={LABEL_CLASS}>
              {t('cg.countyLabel')} <span className="text-red-500">*</span>
            </label>
            <select
              className={FIELD_CLASS}
              value={countyInput}
              onChange={(e) => { setCountyInput(e.target.value); setCountyError('') }}
            >
              <option value="">{t('cg.countyPlaceholder')}</option>
              {ALL_MO_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {countyError && <p className="text-red-500 text-xs mt-1">{countyError}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
          >
            {t('cg.getStarted')}
          </button>
        </form>
      </div>
    </div>
  )
}
