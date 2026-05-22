import { useState, useEffect } from 'react'
import { recordResourceOpen, recordResourceClose } from '../lib/storage'
import { recordResourceClick, recordResourceSession } from '../lib/db'
import { useI18n } from '../lib/i18n'

const CATEGORIES = [
  { id: 'all', key: 'res.cat.all' },
  { id: 'getting-started', key: 'res.cat.gettingStarted' },
  { id: 'walking', key: 'res.cat.walking' },
  { id: 'podcasts', key: 'res.cat.podcasts' },
  { id: 'handouts', key: 'res.cat.handouts' },
  { id: 'programs', key: 'res.cat.programs' },
]

const CATEGORY_COLORS = {
  'getting-started': { chip: 'text-white', chipStyle: { background: '#4BB8C4' }, borderStyle: { borderColor: 'rgba(75,184,196,0.4)' } },
  walking:           { chip: 'text-white', chipStyle: { background: '#3aa8b2' }, borderStyle: { borderColor: 'rgba(75,184,196,0.4)' } },
  podcasts:          { chip: 'text-black', chipStyle: { background: '#F1B82D' }, borderStyle: { borderColor: 'rgba(241,184,45,0.5)' } },
  handouts:          { chip: 'text-white', chipStyle: { background: '#4BB8C4' }, borderStyle: { borderColor: 'rgba(75,184,196,0.4)' } },
  programs:          { chip: 'text-white', chipStyle: { background: '#1A1A1A' }, borderStyle: { borderColor: 'rgba(26,26,26,0.4)' } },
}

// Real MU Extension resources, hosted on Google Drive.
// To add/update: edit this array. Each resource: id, category, title, desc, icon, type, url.
const RESOURCES = [
  {
    id: 1, category: 'getting-started',
    title: 'Walking for Wellness',
    desc: 'A research-backed look at how walking improves cardiovascular health, mental wellbeing, and longevity — and why it is the perfect activity for the 100-mile challenge.',
    icon: '📖', type: 'article',
    url: 'https://drive.google.com/file/d/1AeKJPKVVO3uYiw2ag3EV_lxcEG2Tn0Xi/view?usp=sharing',
  },
  {
    id: 2, category: 'getting-started',
    title: 'Warm-up & Cool-down Guide for Walking',
    desc: 'Simple stretches and movements to do before and after every walk — reduces soreness, prevents injury, and helps you stay consistent all summer.',
    icon: '🤸', type: 'pdf',
    url: 'https://drive.google.com/file/d/1wg2PhPa74caDKzi6P8nowLN7vbuisqXW/view?usp=sharing',
  },
  {
    id: 3, category: 'walking',
    title: '20-Minute Guided Walk',
    desc: 'A guided audio walk you can take anywhere. Press play, head out the door, and let the host pace you through 20 minutes of mindful movement.',
    icon: '🚶', type: 'podcast',
    url: 'https://drive.google.com/file/d/1nY03MABiiwz1zECognLzp8KGGaMJNwTJ/view?usp=sharing',
  },
  {
    id: 4, category: 'walking',
    title: 'Walk Audit Video',
    desc: 'Learn how to assess the walkability of your neighborhood — sidewalks, crossings, lighting, and safety — so you can advocate for better walking infrastructure.',
    icon: '🎬', type: 'video',
    url: 'https://drive.google.com/file/d/1ZIK9WjnBbbqAgMFIqzw-JDCxQX_iwASe/view?usp=sharing',
  },
  {
    id: 5, category: 'walking',
    title: 'Wellness in Motion Video',
    desc: 'A short video on incorporating movement into everyday life — practical tips for staying active beyond formal exercise sessions.',
    icon: '🎥', type: 'video',
    url: 'https://drive.google.com/file/d/1kfRmxN9BTi9_7ApD0llXIzUhquMnHkpt/view?usp=sharing',
  },
  {
    id: 6, category: 'podcasts',
    title: 'Motivational Walking Podcast',
    desc: 'A motivational audio episode to keep you inspired and moving — perfect for headphones during your daily walk.',
    icon: '🎙️', type: 'podcast',
    url: 'https://drive.google.com/file/d/18y87hOm6DEj6JgE8dIbW_6t1q4oN8ogs/view?usp=sharing',
  },
  {
    id: 7, category: 'podcasts',
    title: 'Sun Protection Podcast',
    desc: 'How to protect your skin during summer outdoor activity — sunscreen basics, UV awareness, and the best times of day for safe sun exposure.',
    icon: '☀️', type: 'podcast',
    url: 'https://drive.google.com/file/d/13gCy3jcW6ro2csPCHjEky1thxYHgnIpn/view?usp=sharing',
  },
  {
    id: 8, category: 'handouts',
    title: 'Managing Exercise in the Heat',
    desc: 'Printable handout covering hydration, signs of heat illness, and how to safely stay active during Missouri summer heat waves.',
    icon: '🥵', type: 'pdf',
    url: 'https://drive.google.com/file/d/1B0rhyBwaEhtc2WQVh219AzNvcepwZ8lE/view?usp=sharing',
  },

  // ── MU Extension in-person & self-guided programs ──
  {
    id: 9, category: 'programs',
    title: 'Stay Strong, Stay Healthy',
    desc: 'An 8-week, evidence-based strength training program from MU Extension for older adults. Twice-weekly classes build muscle and bone density, improve balance, and reduce fall risk. Created in 2005, has helped 20,000+ Missourians.',
    icon: '💪', type: 'program',
    url: 'https://extension.missouri.edu/programs/stay-strong-stay-healthy',
  },
  {
    id: 10, category: 'programs',
    title: 'Tai Chi for Arthritis & Falls Prevention',
    desc: 'A gentle, evidence-based tai chi program from MU Extension. 16 one-hour classes teach warm-ups, six basic and six advanced moves, and a cool-down — designed to reduce pain, improve balance, and prevent falls.',
    icon: '🧘', type: 'program',
    url: 'https://extension.missouri.edu/programs/tai-chi-for-arthritis-and-falls-prevention',
  },
  {
    id: 11, category: 'programs',
    title: 'Walk With Ease',
    desc: 'A 6-week walking program from the Arthritis Foundation, offered through MU Extension. Available self-guided or in a community setting — includes stretching, strengthening, walking safety tips, a certified leader, and a free guidebook.',
    icon: '🚶‍♀️', type: 'program',
    url: 'https://extension.missouri.edu/programs/walk-with-ease',
  },
]

const TYPE_BUTTON_KEY = {
  article: 'res.btn.read',
  podcast: 'res.btn.listen',
  video: 'res.btn.watch',
  pdf: 'res.btn.pdf',
  program: 'res.btn.program',
}

export default function Resources() {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState('all')
  const [toastVisible, setToastVisible] = useState(false)
  const [toastTimer, setToastTimer] = useState(null)

  // Close any open resource session when the user navigates away or hides the tab
  useEffect(() => {
    const flush = () => {
      const p = recordResourceClose()
      if (p) recordResourceSession(p.resourceId, p.resourceName, p.durationSeconds)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      flush()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  function handleResourceClick(resource) {
    recordResourceClick(resource.id, resource.title)
    // Close any prior open session and post duration to Supabase
    const sessionPayload = recordResourceClose()
    if (sessionPayload) {
      recordResourceSession(sessionPayload.resourceId, sessionPayload.resourceName, sessionPayload.durationSeconds)
    }
    recordResourceOpen(resource.id, resource.title)

    if (resource.url) {
      // Open in a new tab — user sees the content, no toast needed
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    } else {
      // Fallback: show "coming soon" toast
      if (toastTimer) clearTimeout(toastTimer)
      setToastVisible(true)
      const t = setTimeout(() => setToastVisible(false), 2500)
      setToastTimer(t)
    }
  }

  const filtered =
    activeCategory === 'all' ? RESOURCES : RESOURCES.filter((r) => r.category === activeCategory)

  const catTabClass = (id) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
      activeCategory === id
        ? 'bg-[#F1B82D] text-black'
        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
    }`

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center">
          <span className="inline-block bg-[#F1B82D] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            {t('res.muext')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mb-2">{t('res.heading')}</h1>
          <p className="text-gray-500 max-w-xl mx-auto">{t('res.sub')}</p>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={catTabClass(cat.id)}>
              {t(cat.key)}
            </button>
          ))}
        </div>

        {/* Resource grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((resource) => {
            const colors = CATEGORY_COLORS[resource.category]
            const cat = CATEGORIES.find((c) => c.id === resource.category)
            const catLabel = cat ? t(cat.key) : ''
            return (
              <div
                key={resource.id}
                className="bg-white rounded-2xl shadow-sm border-2 hover:shadow-md transition-all flex flex-col"
                style={colors.borderStyle}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-3xl flex-shrink-0">{resource.icon}</div>
                    <div>
                      <span
                        className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${colors.chip}`}
                        style={colors.chipStyle}
                      >
                        {catLabel}
                      </span>
                      <h3 className="font-bold text-[#1A1A1A] text-sm leading-snug">{resource.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{resource.desc}</p>
                </div>

                <div className="px-6 pb-6">
                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      resource.type === 'pdf'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : resource.type === 'podcast'
                        ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        : resource.type === 'video'
                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        : resource.type === 'program'
                        ? 'bg-[#1A1A1A] text-[#F1B82D] hover:bg-black border border-[#1A1A1A]'
                        : 'bg-[#F1B82D] text-black hover:bg-[#d4a228]'
                    }`}
                    onClick={() => handleResourceClick(resource)}
                  >
                    {t(TYPE_BUTTON_KEY[resource.type])}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Toast notification */}
        {toastVisible && (
          <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2">
            {t('res.toast')}
          </div>
        )}

        {/* CTA banner */}
        <div className="bg-[#1A1A1A] rounded-2xl p-8 text-center">
          <h2 className="text-white text-xl font-extrabold mb-2">{t('res.cantFind')}</h2>
          <p className="text-gray-400 text-sm mb-6">{t('res.cantFindBody')}</p>
          <a
            href="https://extension.missouri.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#F1B82D] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4a228] transition-colors"
          >
            {t('res.visitBtn')}
          </a>
        </div>
      </div>
    </div>
  )
}
