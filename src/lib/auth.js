// Admin auth wrapper. Uses Supabase Auth in production.
// In dev (no Supabase), falls back to the hardcoded password gate.

import { supabase, HAS_SUPABASE } from './supabase'

const DEV_PASSWORD = 'MUExtension2026'

export async function signInAdmin(emailOrPassword, password) {
  if (!HAS_SUPABASE) {
    // Dev mode: single password gate, no email needed
    const pw = password ?? emailOrPassword
    if (pw === DEV_PASSWORD) return { ok: true }
    return { ok: false, error: 'Incorrect password.' }
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: emailOrPassword,
    password,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOutAdmin() {
  if (HAS_SUPABASE) await supabase.auth.signOut()
}

export async function getAdminSession() {
  if (!HAS_SUPABASE) return null
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

export function onAuthChange(cb) {
  if (!HAS_SUPABASE) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_evt, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
