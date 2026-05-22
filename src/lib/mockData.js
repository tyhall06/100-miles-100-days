import { isCodeBanned } from './storage'

// ─── Activity constants ────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  'Walking', 'Running', 'Hiking', 'Biking', 'Swimming', 'Dancing',
  'Strength Training', 'Yoga', 'Wheelchair Rolling', 'Gardening',
  'Pickleball', 'Basketball', 'Other',
]

// All activities log miles directly. The conversions below are guidance
// shown to participants in the "What counts as a mile?" helper so they can
// translate minutes or pedometer steps into miles before entering them.
export const MINUTES_PER_MILE = 20
export const STEPS_PER_MILE = 2000

export const MAX_MILES_PER_ENTRY = 50

export function minutesToMiles(minutes) {
  return parseFloat((minutes / MINUTES_PER_MILE).toFixed(2))
}

export function stepsToMiles(steps) {
  return parseFloat((steps / STEPS_PER_MILE).toFixed(2))
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

const rng = seededRandom(20260615)

function pick(arr) { return arr[Math.floor(rng() * arr.length)] }
function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min }
function randFloat(min, max) { return parseFloat((rng() * (max - min) + min).toFixed(2)) }

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─── Mock data pools ───────────────────────────────────────────────────────────

const DISPLAY_NAMES = [
  'BooneBiker', 'QueenCityWalker', 'MidMOMover', 'OzarkStrider', 'GatewayGaiter',
  'ShowMeRunner', 'MizzouMiles', 'JoplinJogger', 'SpfldSprinter', 'CocomoRunner',
  'HannibalHiker', 'KCKicker', 'StlStrider', 'RollaMover', 'JeffCityJogger',
  'KirkWalker', 'WarrenMiles', 'CapeRunner', 'SedaliaStepper', 'FultonFit',
  'HermansWalker', 'NevadaMover', 'GraniteCityFit', 'LibertyLoper', 'IndepRunner',
  'LeesLaps', 'FergFit', 'ArnoldAthlete', 'FlorissMiles', 'ClaytonCruiser',
  'WildwoodWalker', 'ChesterfieldChamp', 'BallwinBiker', 'FentonFit', 'DesPeresRun',
  'UnionMover', 'WashingtonWalker', 'SullivanStrider', 'RaymondRunner', 'OsageAthlete',
  'BolivarBiker', 'RepublicRun', 'NixaMiles', 'OzarkMover', 'TaneyStepper',
  'StoneFit', 'ChristianCountyFit', 'GreeneGaiter', 'LacledeRunner', 'DallasWalker',
]

const COUNTIES = [
  'Boone', 'St. Louis', 'Jackson', 'Greene', 'Cole',
  'Montgomery', 'Jefferson', 'Clay', 'Platte', 'Christian',
]

const NOTES_POOL = [
  'Great morning walk!', 'Felt strong today', 'Beautiful weather for a ride',
  'Legs were tired but pushed through', 'New personal best!', 'Enjoyed the trail',
  'Short but consistent', 'Rainy day workout', 'Did this with my dog',
  'Lunchtime walk at work', 'Evening swim — very relaxing', null, null, null,
  null, null,
]

const DIRECT_TYPES = ['Walking', 'Running', 'Hiking', 'Wheelchair Rolling']
const INDIRECT_TYPES = ['Biking', 'Swimming', 'Dancing', 'Strength Training', 'Yoga', 'Gardening', 'Pickleball', 'Basketball', 'Other']
const ALL_LOG_TYPES = [...DIRECT_TYPES, ...INDIRECT_TYPES]

const CHALLENGE_START = '2026-06-16'

// ─── Generate 50 mock participants (codes 1001–1050) ─────────────────────────

export const mockParticipants = Array.from({ length: 50 }, (_, i) => ({
  code: String(1001 + i),
  display_name: DISPLAY_NAMES[i],
  county: COUNTIES[i % COUNTIES.length],
  created_at: `2026-06-${String(1 + (i % 14)).padStart(2, '0')}T10:00:00Z`,
}))

// ─── Generate activity logs ───────────────────────────────────────────────────

export const mockActivityLogs = []

mockParticipants.forEach((participant) => {
  const logCount = randInt(5, 15)
  const totalDays = 35 // days between CHALLENGE_START and 2026-07-20

  const usedDays = new Set()
  while (usedDays.size < logCount) {
    usedDays.add(randInt(0, totalDays - 1))
  }

  Array.from(usedDays).forEach((dayOffset) => {
    const date = addDays(CHALLENGE_START, dayOffset)
    const actType = pick(ALL_LOG_TYPES)
    let miles

    // Mock seeded miles per entry — varies by activity type for realistic data
    if (DIRECT_TYPES.includes(actType)) {
      miles = randFloat(1.0, 5.0)
    } else {
      miles = randFloat(0.5, 4.5)
    }

    mockActivityLogs.push({
      id: `mock-log-${participant.code}-${dayOffset}`,
      participant_code: participant.code,
      date,
      activity_type: actType,
      miles,
      notes: pick(NOTES_POOL),
      created_at: `${date}T${String(randInt(6, 20)).padStart(2, '0')}:00:00Z`,
    })
  })
})

// ─── Exported helper functions ────────────────────────────────────────────────

// Fresh "demo registration" codes — these have NO display_name or county yet,
// so entering one walks the user through the full registration flow.
// Reusable: clearing localStorage resets them. Range: 9001–9010.
export const DEMO_REGISTRATION_CODES = Array.from({ length: 10 }, (_, i) => String(9001 + i))

export function validateCode(code) {
  // PRODUCTION: check Supabase participants table
  if (isCodeBanned(code)) return null

  // Fresh demo code → behaves like a brand-new registrant
  if (DEMO_REGISTRATION_CODES.includes(code)) {
    return { code, display_name: null, county: null, created_at: null }
  }

  return mockParticipants.find((p) => p.code === code) || null
}

export function getLogsForCode(code) {
  return mockActivityLogs
    .filter((l) => l.participant_code === code)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getTotalMilesForCode(code) {
  return parseFloat(
    mockActivityLogs
      .filter((l) => l.participant_code === code)
      .reduce((sum, l) => sum + l.miles, 0)
      .toFixed(2)
  )
}

export function getLeaderboard() {
  return mockParticipants
    .map((p) => ({
      code: p.code,
      display_name: p.display_name,
      county: p.county,
      totalMiles: getTotalMilesForCode(p.code),
    }))
    .sort((a, b) => b.totalMiles - a.totalMiles)
    .slice(0, 25)
}

export function getCountyStats() {
  const map = {}
  mockParticipants.forEach((p) => {
    if (!map[p.county]) map[p.county] = { county: p.county, participants: 0, totalMiles: 0 }
    map[p.county].participants++
    map[p.county].totalMiles += getTotalMilesForCode(p.code)
  })
  return Object.values(map)
    .map((c) => ({
      ...c,
      totalMiles: parseFloat(c.totalMiles.toFixed(1)),
      avgMiles: parseFloat((c.totalMiles / c.participants).toFixed(1)),
    }))
    .sort((a, b) => b.totalMiles - a.totalMiles)
}

export function getStatsStatewide() {
  const totalParticipants = mockParticipants.length
  const totalMiles = parseFloat(
    mockActivityLogs.reduce((sum, l) => sum + l.miles, 0).toFixed(1)
  )
  const challengeEnd = new Date('2026-09-24T00:00:00')
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.max(0, Math.ceil((challengeEnd - today) / msPerDay))

  return { totalParticipants, totalMiles, daysRemaining }
}
