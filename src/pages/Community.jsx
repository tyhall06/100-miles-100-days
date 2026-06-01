import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDisplayName, getCounty } from '../lib/storage'
import { saveSubmission, getApprovedSubmissions } from '../lib/db'
import { useI18n } from '../lib/i18n'

const MAX_PHOTO_BYTES = 3 * 1024 * 1024 // 3MB
const MAX_CAPTION = 200
const MAX_STORY = 500

function InstagramIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Community() {
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState(null)
  const [county, setCounty] = useState(null)

  // Photo form state
  const [photoData, setPhotoData] = useState(null) // base64 data URL
  const [photoError, setPhotoError] = useState('')
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef(null)

  // Story form state
  const [storyText, setStoryText] = useState('')

  // Community wall
  const [approved, setApproved] = useState([])

  // Toast
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  useEffect(() => {
    setDisplayName(getDisplayName())
    setCounty(getCounty())
    getApprovedSubmissions().then(setApproved)
  }, [])

  function showToast(message) {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 3000)
  }

  function handlePhotoSelect(e) {
    setPhotoError('')
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoData(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError(t('com.errImage'))
      setPhotoData(null)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('com.errSize'))
      setPhotoData(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoData(ev.target.result)
    reader.onerror = () => setPhotoError(t('com.errRead'))
    reader.readAsDataURL(file)
  }

  async function handlePhotoSubmit(e) {
    e.preventDefault()
    if (!displayName || !county) return
    if (!photoData) {
      setPhotoError(t('com.errChoose'))
      return
    }
    await saveSubmission({
      id: Date.now().toString(),
      type: 'photo',
      content: photoData,
      caption: caption.trim(),
      displayName,
      county,
    })
    setPhotoData(null)
    setCaption('')
    setPhotoError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    showToast(t('com.submitted'))
  }

  async function handleStorySubmit(e) {
    e.preventDefault()
    if (!displayName || !county) return
    const text = storyText.trim()
    if (!text) return
    await saveSubmission({
      id: Date.now().toString(),
      type: 'story',
      content: text.slice(0, MAX_STORY),
      displayName,
      county,
    })
    setStoryText('')
    showToast(t('com.submitted'))
  }

  const isLoggedIn = Boolean(displayName && county)

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Section A: Header */}
        <div className="text-center">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            {t('com.connect')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#000000] mb-2">{t('com.heading')}</h1>
          <p className="text-gray-500 max-w-xl mx-auto">{t('com.sub')}</p>
        </div>

        {/* Section B: Instagram Feed */}
        <section className="bg-[#000000] rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h2 className="text-white text-2xl font-extrabold mb-2">{t('com.followMovement')}</h2>
            <p className="text-gray-400 text-sm">
              {t('com.tagPhotos')} <span className="text-[#F1B82D] font-semibold">#100Miles100Days</span> {t('com.andFollow')}{' '}
              <span className="text-[#F1B82D] font-semibold">@MUExtension100Miles</span>
            </p>
          </div>

          {/* PRODUCTION: Replace placeholder grid with Curator.io or Juicer.io embed script */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-800 rounded-xl flex items-center justify-center"
              >
                <InstagramIcon className="w-10 h-10 text-gray-600" />
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-xs mb-6">
            {t('com.feedSoon')}
          </p>

          <div className="text-center">
            <a
              href="https://instagram.com/explore/tags/100miles100days"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#F1B82D] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
            >
              <InstagramIcon className="w-5 h-5" />
              {t('com.openIG')}
            </a>
          </div>
        </section>

        {/* Two-column layout for photo + story on wider screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section C: Photo Upload */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-extrabold text-[#000000] mb-1">{t('com.sharePhoto')}</h2>
            <p className="text-gray-500 text-sm mb-5">{t('com.sharePhotoSub')}</p>

            {!isLoggedIn ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                {t('com.pleaseEnterCode')}{' '}
                <Link to="/log" className="text-[#1C5E90] font-semibold underline">{t('nav.logMiles')}</Link>.
              </div>
            ) : (
              <form onSubmit={handlePhotoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {t('com.photoLabel')}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#F1B82D] file:text-black hover:file:bg-[#d4a228] focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
                  />
                  {photoError && <p className="text-red-500 text-xs mt-2">{photoError}</p>}
                </div>

                {photoData && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={photoData} alt="Preview" className="w-full max-h-64 object-contain" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {t('com.captionLabel')}
                  </label>
                  <input
                    type="text"
                    maxLength={MAX_CAPTION}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t('com.captionPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D]"
                  />
                  <p className="text-right text-xs text-gray-400 mt-1">
                    {caption.length}/{MAX_CAPTION}
                  </p>
                </div>

                <div className="text-xs text-gray-500">
                  {t('com.submittingAs')} <span className="font-semibold text-gray-700">{displayName}</span>
                  {county && <> · <span className="font-semibold text-gray-700">{county}</span></>}
                </div>

                <button
                  type="submit"
                  disabled={!photoData}
                  className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('com.submitPhoto')}
                </button>
              </form>
            )}
          </section>

          {/* Section D: Success Stories & Tips */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-extrabold text-[#000000] mb-1">{t('com.shareStory')}</h2>
            <p className="text-gray-500 text-sm mb-5">{t('com.shareStorySub')}</p>

            {!isLoggedIn ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                {t('com.pleaseEnterCode')}{' '}
                <Link to="/log" className="text-[#1C5E90] font-semibold underline">{t('nav.logMiles')}</Link>.
              </div>
            ) : (
              <form onSubmit={handleStorySubmit} className="space-y-4">
                <div>
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value.slice(0, MAX_STORY))}
                    maxLength={MAX_STORY}
                    rows={6}
                    placeholder={t('com.storyPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F1B82D] focus:border-[#F1B82D] resize-none"
                  />
                  <p className="text-right text-xs text-gray-400 mt-1">
                    {storyText.length}/{MAX_STORY}
                  </p>
                </div>

                <div className="text-xs text-gray-500">
                  {t('com.submittingAs')} <span className="font-semibold text-gray-700">{displayName}</span>
                  {county && <> · <span className="font-semibold text-gray-700">{county}</span></>}
                </div>

                <button
                  type="submit"
                  disabled={!storyText.trim()}
                  className="w-full bg-[#F1B82D] text-black font-bold py-3 rounded-xl hover:bg-[#d4a228] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('com.submitStory')}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Section E: Community Wall */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-[#000000]">{t('com.fromCommunity')}</h2>
            {approved.length > 0 && (
              <span className="text-xs text-gray-400">{approved.length} {t('com.approved')}</span>
            )}
          </div>

          {approved.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-500 text-lg font-semibold mb-4">{t('com.beFirst')}</p>
              <p className="text-gray-400 text-sm mb-6">{t('com.beFirstBody')}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href="#share-photo"
                  onClick={(e) => {
                    e.preventDefault()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="inline-block bg-[#F1B82D] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#d4a228] transition-colors"
                >
                  {t('com.sharePhoto')}
                </a>
                <a
                  href="https://instagram.com/explore/tags/100miles100days"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#000000] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-black transition-colors"
                >
                  {t('com.openIG')}
                </a>
              </div>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {approved.map((s) => (
                <div key={s.id} className="break-inside-avoid">
                  {s.type === 'photo' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <img
                        src={s.content}
                        alt={s.caption || 'Community submission'}
                        className="w-full object-cover"
                      />
                      {s.caption && (
                        <div className="p-4">
                          <p className="text-sm text-gray-700">{s.caption}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl shadow-sm border border-gray-100 p-6"
                      style={{ background: 'rgba(241,184,45,0.12)' }}
                    >
                      <p className="italic text-gray-800 text-sm leading-relaxed">
                        <span className="text-[#8B6914] text-3xl leading-none font-serif mr-1">&ldquo;</span>
                        {s.content}
                        <span className="text-[#8B6914] text-3xl leading-none font-serif ml-1">&rdquo;</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toast */}
        {toast && (
          <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#000000] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2">
            <span aria-hidden="true">&#10003;</span> {toast}
          </div>
        )}
      </div>
    </div>
  )
}
