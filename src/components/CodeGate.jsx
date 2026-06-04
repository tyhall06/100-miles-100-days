import { useState, useEffect } from 'react'
import { getCode, getDisplayName, saveParticipant } from '../lib/storage'
import { validateCode, upsertParticipantProfile, getTeams, createTeam, setParticipantTeam } from '../lib/db'
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

  // Team step state
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamBusy, setTeamBusy] = useState(false)

  useEffect(() => {
    if (step !== 'team') return
    setTeamsLoading(true)
    getTeams()
      .then((list) => setTeams(list || []))
      .catch((e) => console.error('getTeams', e))
      .finally(() => setTeamsLoading(false))
  }, [step])

  const filteredTeams = teams.filter((tm) =>
    tm.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
  )

  async function finishWithTeam(teamId) {
    setTeamBusy(true)
    try {
      await setParticipantTeam(validatedCode, teamId)
    } catch (e) {
      console.error('setParticipantTeam', e)
    } finally {
      setTeamBusy(false)
      setStep('done')
    }
  }

  async function handleJoinTeam(teamId) {
    await finishWithTeam(teamId)
  }

  async function handleSolo() {
    await finishWithTeam(null)
  }

  async function handleCreateTeam() {
    const name = newTeamName.trim()
    if (name.length < 2 || name.length > 40) {
      setTeamError(t('cg.teamErrName'))
      return
    }
    if (isProfane(name)) {
      setTeamError(t('cg.teamErrProfane'))
      return
    }
    if (!window.confirm(t('cg.teamCreateConfirm', { name }))) return
    setTeamBusy(true)
    const { data, error } = await createTeam(name)
    if (error || !data) {
      setTeamBusy(false)
      setTeamError(t('cg.teamErr'))
      return
    }
    if (data.existed) window.alert(t('cg.teamExisted'))
    await finishWithTeam(data.id)
  }

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
    setStep('team')
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
            <h1 className="text-2xl font-extrabold text-[#000000] mb-2">{t('cg.codeTitle')}</h1>
            <p className="text-gray-500 text-sm">{t('cg.codeSub')}</p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="cg-code" className={LABEL_CLASS}>{t('cg.codeLabel')}</label>
              <input
                id="cg-code"
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
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'cg-code-error' : undefined}
                required
              />
              {codeError && (
                <p id="cg-code-error" role="alert" className="text-red-500 text-xs mt-2">{codeError}</p>
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

  // ── Step 3: Join / create a team, or fly solo ──────────────────────────────
  if (step === 'team') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#1C5E90] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.83-4M7 11a3 3 0 10-2.83-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#000000] mb-2">{t('cg.teamTitle')}</h1>
            <p className="text-gray-500 text-sm">{t('cg.teamSub')}</p>
          </div>

          {/* Search existing teams */}
          <input
            type="search"
            className={FIELD_CLASS}
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder={t('cg.teamSearch')}
            aria-label={t('cg.teamSearch')}
          />

          <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
            {teamsLoading ? (
              <p className="text-center text-sm text-gray-400 py-6">…</p>
            ) : filteredTeams.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">{t('cg.teamNone')}</p>
            ) : (
              filteredTeams.map((tm) => (
                <div key={tm.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{tm.name}</p>
                    <p className="text-xs text-gray-400">
                      {tm.members === 1 ? t('cg.teamMember') : t('cg.teamMembers', { count: tm.members })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinTeam(tm.id)}
                    disabled={teamBusy}
                    className="shrink-0 text-xs bg-[#1C5E90] text-white font-bold px-4 py-1.5 rounded-lg hover:bg-[#164a73] transition-colors disabled:opacity-40"
                  >
                    {t('cg.teamJoin')}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Create a new team */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('cg.teamCreateTitle')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                className={FIELD_CLASS}
                value={newTeamName}
                onChange={(e) => { setNewTeamName(e.target.value.slice(0, 40)); if (teamError) setTeamError('') }}
                placeholder={t('cg.teamCreatePlaceholder')}
                maxLength={40}
                aria-label={t('cg.teamCreatePlaceholder')}
              />
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={teamBusy || newTeamName.trim().length < 2}
                className="shrink-0 bg-[#F1B82D] text-black font-bold px-4 rounded-lg hover:bg-[#d4a228] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {t('cg.teamCreate')}
              </button>
            </div>
            {teamError && <p role="alert" className="text-red-500 text-xs mt-2">{teamError}</p>}
          </div>

          {/* Fly solo */}
          <button
            type="button"
            onClick={handleSolo}
            disabled={teamBusy}
            className="w-full mt-5 text-sm font-semibold text-gray-600 border border-gray-300 py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            {t('cg.teamSolo')}
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Choose display name + county ───────────────────────────────────
  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1C5E90] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-[#000000] mb-2">{t('cg.welcome')}</h1>
          <p className="text-gray-500 text-sm">{t('cg.welcomeSub')}</p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          {/* Display name */}
          <div>
            <label htmlFor="cg-name" className={LABEL_CLASS}>
              {t('cg.nameLabel')} <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="cg-name"
              type="text"
              className={FIELD_CLASS}
              value={nameInput}
              onChange={(e) => handleNameInput(e.target.value)}
              placeholder={t('cg.namePlaceholder')}
              maxLength={20}
              autoFocus
              aria-describedby="cg-name-hint"
              aria-invalid={!!nameError}
              required
            />
            <p id="cg-name-hint" className="text-xs text-gray-400 mt-1">
              {t('cg.nameHint')}
              {nameInput.length > 0 && (
                <span className="ml-2 text-gray-500">{nameInput.length}/20</span>
              )}
            </p>
            {nameError && <p role="alert" className="text-red-500 text-xs mt-1">{nameError}</p>}
          </div>

          {/* County */}
          <div>
            <label htmlFor="cg-county" className={LABEL_CLASS}>
              {t('cg.countyLabel')} <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <select
              id="cg-county"
              className={FIELD_CLASS}
              value={countyInput}
              onChange={(e) => { setCountyInput(e.target.value); setCountyError('') }}
              aria-invalid={!!countyError}
              required
            >
              <option value="">{t('cg.countyPlaceholder')}</option>
              {ALL_MO_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {countyError && <p role="alert" className="text-red-500 text-xs mt-1">{countyError}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
          >
            {t('cg.next')}
          </button>
        </form>
      </div>
    </div>
  )
}
