import { createClient } from '@supabase/supabase-js'

// Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env (local) or
// Netlify env vars (production). If unset, exports null and the app
// transparently falls back to localStorage + mock data (prototype mode).

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && anon ? createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
}) : null

export const HAS_SUPABASE = !!supabase

export default supabase
