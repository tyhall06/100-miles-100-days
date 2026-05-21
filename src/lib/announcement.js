// Site-wide announcement banner, set by admin.
// PRODUCTION: Store in a Supabase `announcements` table (single active row).

const KEY_TEXT = 'site_announcement'
const KEY_UPDATED = 'site_announcement_updated'
const KEY_DISMISSED = 'site_announcement_dismissed'

export function getAnnouncement() {
  const text = localStorage.getItem(KEY_TEXT) || ''
  const updated = localStorage.getItem(KEY_UPDATED) || ''
  return { text, updated }
}

export function setAnnouncement(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    localStorage.removeItem(KEY_TEXT)
    localStorage.removeItem(KEY_UPDATED)
    localStorage.removeItem(KEY_DISMISSED)
    return
  }
  const now = new Date().toISOString()
  localStorage.setItem(KEY_TEXT, trimmed)
  localStorage.setItem(KEY_UPDATED, now)
  localStorage.removeItem(KEY_DISMISSED)
}

export function isAnnouncementDismissed() {
  const updated = localStorage.getItem(KEY_UPDATED)
  const dismissed = localStorage.getItem(KEY_DISMISSED)
  return !!updated && dismissed === updated
}

export function dismissAnnouncement() {
  const updated = localStorage.getItem(KEY_UPDATED)
  if (updated) localStorage.setItem(KEY_DISMISSED, updated)
}
