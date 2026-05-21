// Milestone celebration tracking. Per-code, remembers thresholds already celebrated.

export const MILESTONES = [10, 25, 50, 75, 100]

function key(code) { return `milestones_${code}` }

export function getCelebrated(code) {
  if (!code) return []
  try {
    const raw = localStorage.getItem(key(code))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function markCelebrated(code, threshold) {
  if (!code) return
  const list = getCelebrated(code)
  if (!list.includes(threshold)) {
    list.push(threshold)
    localStorage.setItem(key(code), JSON.stringify(list))
  }
}

// Given prior total and new total, return the highest newly-crossed milestone
// that hasn't been celebrated yet — or null.
export function findNewMilestone(code, priorMiles, newMiles) {
  const celebrated = getCelebrated(code)
  const crossed = MILESTONES.filter(
    (m) => priorMiles < m && newMiles >= m && !celebrated.includes(m)
  )
  if (crossed.length === 0) return null
  return Math.max(...crossed)
}
