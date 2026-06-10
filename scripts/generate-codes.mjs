#!/usr/bin/env node
/**
 * generate-codes.mjs
 * ------------------------------------------------------------------------
 * Mint a stable 4-digit participant code for every PEARS registration and
 * keep those assignments consistent across repeated PEARS exports.
 *
 * WHY THIS IS SAFE TO RE-RUN:
 *   Codes are keyed to each registrant's PEARS `registration_id`, which never
 *   changes. The script reads the previous master map (code-map.csv) and only
 *   mints NEW codes for registration_ids it hasn't seen before. Everyone who
 *   already has a code keeps it — no reshuffling when your colleague pulls a
 *   fresh, longer export days or weeks later.
 *
 * USAGE:
 *   node scripts/generate-codes.mjs "<path-to-PEARS-export.xlsx>"
 *
 *   Optional flags:
 *     --out <dir>           Output folder (default: ./code-output)
 *     --map <file>          Master map to read+update (default: <out>/code-map.csv)
 *     --status Complete     Only mint codes for rows with this status
 *                           (repeatable; omit to include every row)
 *
 * OUTPUTS (in --out):
 *   code-map.csv            MASTER. registration_id,first_name,last_name,email,status,code
 *                           Keep this. It is the source of truth and the input
 *                           for the next run. Treat it like the PEARS data
 *                           (it contains emails) — store securely, never commit.
 *   supabase-codes.csv      One column: code. Import into the participants table.
 *   dotdigital-merge.csv    email,first_name,code  — for the welcome/code email.
 * ------------------------------------------------------------------------
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as XLSX from 'xlsx'

// ── Code pool ───────────────────────────────────────────────────────────────
// Draw from 1000–8999 (8,000 codes). Avoids the demo block (9001–9010) and
// codes with a leading zero (less error-prone when typed/spoken). Widen if you
// ever expect > ~8,000 participants.
const CODE_MIN = 1000
const CODE_MAX = 8999

// ── Tiny arg parser ───────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const opts = { out: 'code-output', map: null, status: [] }
const positional = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--out') opts.out = args[++i]
  else if (a === '--map') opts.map = args[++i]
  else if (a === '--status') opts.status.push(args[++i])
  else positional.push(a)
}
const inputXlsx = positional[0]
if (!inputXlsx) {
  console.error('ERROR: pass the PEARS export path.\n  node scripts/generate-codes.mjs "Event Registrations Export.xlsx"')
  process.exit(1)
}
if (!fs.existsSync(inputXlsx)) {
  console.error(`ERROR: file not found: ${inputXlsx}`)
  process.exit(1)
}
const outDir = path.resolve(opts.out)
const mapPath = opts.map ? path.resolve(opts.map) : path.join(outDir, 'code-map.csv')
fs.mkdirSync(outDir, { recursive: true })

// ── Minimal CSV helpers (handles quotes/commas/newlines) ──────────────────────
function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(rows) {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n') + '\r\n'
}
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* skip */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
}

// ── 1. Read the existing master map (if any) ──────────────────────────────────
const existing = new Map()      // registration_id -> { ...fields, code }
const usedCodes = new Set()
if (fs.existsSync(mapPath)) {
  const rows = parseCsv(fs.readFileSync(mapPath, 'utf8'))
  const header = rows.shift().map((h) => h.trim())
  const idx = (name) => header.indexOf(name)
  for (const r of rows) {
    const rec = {
      registration_id: r[idx('registration_id')],
      first_name: r[idx('first_name')],
      last_name: r[idx('last_name')],
      email: r[idx('email')],
      status: r[idx('status')],
      code: r[idx('code')],
    }
    if (!rec.registration_id) continue
    existing.set(rec.registration_id, rec)
    if (rec.code) usedCodes.add(rec.code)
  }
  console.log(`Loaded ${existing.size} existing assignments from ${path.basename(mapPath)}`)
} else {
  console.log('No existing map found — starting fresh.')
}

// ── 2. Read the PEARS export; find the Event Registrations sheet ──────────────
const wb = XLSX.read(fs.readFileSync(inputXlsx), { type: 'buffer' })
let sheetName = wb.SheetNames.find((n) => /event registration/i.test(n))
let rows = sheetName
  ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false })
  : null

// Fallback: find whichever sheet has a "registration_id" header.
if (!rows || !rows.some((r) => r.includes('registration_id'))) {
  for (const n of wb.SheetNames) {
    const test = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false })
    if (test.some((r) => r.includes('registration_id'))) { sheetName = n; rows = test; break }
  }
}
if (!rows) { console.error('ERROR: could not find a sheet with a registration_id column.'); process.exit(1) }

const headerRowIdx = rows.findIndex((r) => r.includes('registration_id'))
const header = rows[headerRowIdx]
const col = (name) => header.indexOf(name)
const dataRows = rows.slice(headerRowIdx + 1).filter((r) => r[col('registration_id')] !== '')
console.log(`Read ${dataRows.length} registrations from sheet "${sheetName}".`)

// ── 3. Mint codes for new registration_ids only ──────────────────────────────
function randomFreeCode() {
  // Plenty of headroom (8000 codes); random with collision retry is fine.
  for (let tries = 0; tries < 100000; tries++) {
    const c = String(Math.floor(Math.random() * (CODE_MAX - CODE_MIN + 1)) + CODE_MIN)
    if (!usedCodes.has(c)) return c
  }
  throw new Error('Code pool exhausted — widen CODE_MIN/CODE_MAX.')
}

let minted = 0, kept = 0, skipped = 0
const seenEmails = new Map()
const master = []        // ordered output records
const mintedRecords = [] // only the codes newly created on THIS run

for (const r of dataRows) {
  const regId = String(r[col('registration_id')]).trim()
  const status = col('status') >= 0 ? String(r[col('status')]).trim() : ''
  const email = col('email') >= 0 ? String(r[col('email')]).trim() : ''
  const first = col('first_name') >= 0 ? String(r[col('first_name')]).trim() : ''
  const last = col('last_name') >= 0 ? String(r[col('last_name')]).trim() : ''

  if (opts.status.length && !opts.status.includes(status)) { skipped++; continue }

  let rec = existing.get(regId)
  if (rec) {
    // Keep the existing code; refresh contact fields in case PEARS updated them.
    rec = { ...rec, first_name: first, last_name: last, email, status }
    kept++
  } else {
    const code = randomFreeCode()
    usedCodes.add(code)
    rec = { registration_id: regId, first_name: first, last_name: last, email, status, code }
    existing.set(regId, rec)
    mintedRecords.push(rec)
    minted++
  }
  if (email) {
    const lc = email.toLowerCase()
    if (seenEmails.has(lc)) {
      console.warn(`  ! duplicate email "${email}" (reg ${seenEmails.get(lc)} and ${regId}) — both get separate codes.`)
    } else seenEmails.set(lc, regId)
  }
  master.push(rec)
}

// Also carry forward any historical assignments not present in this export
// (e.g. someone removed from a filtered pull) so their code is never reused.
for (const [regId, rec] of existing) {
  if (!master.find((m) => m.registration_id === regId)) master.push(rec)
}

// ── 4. Write outputs ──────────────────────────────────────────────────────────
const masterHeader = ['registration_id', 'first_name', 'last_name', 'email', 'status', 'code']
const masterRows = [masterHeader, ...master.map((m) => masterHeader.map((h) => m[h] ?? ''))]
fs.writeFileSync(mapPath, toCsv(masterRows))

const codes = [...new Set(master.map((m) => m.code).filter(Boolean))].sort()
fs.writeFileSync(path.join(outDir, 'supabase-codes.csv'), toCsv([['code'], ...codes.map((c) => [c])]))

const mergeRows = [['email', 'first_name', 'code'],
  ...master.filter((m) => m.email).map((m) => [m.email, m.first_name, m.code])]
fs.writeFileSync(path.join(outDir, 'dotdigital-merge.csv'), toCsv(mergeRows))

// Only the people who got a NEW code this run — use this to email just the
// newcomers (so you never re-email people who already have their code).
const newMergeRows = [['email', 'first_name', 'code'],
  ...mintedRecords.filter((m) => m.email).map((m) => [m.email, m.first_name, m.code])]
fs.writeFileSync(path.join(outDir, 'dotdigital-merge-new.csv'), toCsv(newMergeRows))

// ── 5. Summary ────────────────────────────────────────────────────────────────
console.log('\n────────── DONE ──────────')
console.log(`  Newly minted codes : ${minted}`)
console.log(`  Kept (unchanged)   : ${kept}`)
if (skipped) console.log(`  Skipped (status)   : ${skipped}`)
console.log(`  Total codes        : ${codes.length}`)
console.log(`\nFiles written to ${outDir}:`)
console.log(`  code-map.csv             (MASTER — keep, contains emails, do not commit)`)
console.log(`  supabase-codes.csv       (ALL codes — import into participants; existing are skipped)`)
console.log(`  dotdigital-merge.csv     (ALL email + code)`)
console.log(`  dotdigital-merge-new.csv (ONLY this run's new people — email just these)`)
