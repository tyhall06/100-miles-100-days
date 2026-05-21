# Deployment Walkthrough — 100 Miles, 100 Days

A detailed, click-by-click guide from your current state (working prototype on Netlify Drop) to a real production site with a database, custom domain, and admin login.

**Total active time:** ~2 hours. Plus DNS waiting time (5 min - 24 hrs).
**Cost for the year:** ~$12 (domain registration only — everything else is free tier).

> ⚠️ Don't skip steps. They build on each other.

---

## What you'll be creating

By the end you'll have:
1. A **GitHub repo** holding your code
2. A **Supabase project** as the database
3. A **Netlify site** auto-deploying from GitHub
4. A **domain** like `100miles100days.org` pointing at the site
5. An **admin login** with your email + password

---

## Before you start — accounts you need

Open these tabs and create accounts (free, no credit card needed for any of them):

1. **GitHub** — https://github.com/signup
   - Pick any username (this won't be public)
2. **Supabase** — https://supabase.com → "Start your project" → sign in with the GitHub account you just made
3. **Netlify** — https://app.netlify.com/signup → choose "Sign up with GitHub"

Three accounts, all linked to GitHub for simplicity. Keep all three tabs open.

---

# PHASE 1 — Push your code to GitHub (20 min)

## 1.1 — Install Git (skip if you already have it)

Open PowerShell or Command Prompt and type:
```
git --version
```

If you see something like `git version 2.45.0`, you're good. Skip to 1.2.

If you see "command not found", download Git from https://git-scm.com/download/win and install with all defaults. Restart PowerShell after.

## 1.2 — Tell Git who you are

In PowerShell, run (replacing with your info):
```
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

You only need to do this once, ever.

## 1.3 — Create the GitHub repo

1. Go to https://github.com/new
2. **Repository name:** `100-miles-100-days`
3. **Description:** "MU Extension 100 Miles 100 Days challenge site"
4. **Privacy:** ✅ **Private** (you can flip to public later if you want)
5. **DO NOT** check "Add a README", "Add .gitignore", or "Add a license" — your project already has those
6. Click the green **Create repository** button
7. You'll land on a page that says "Quick setup — if you've done this kind of thing before". **Leave this tab open** — you'll need the URL in step 1.5.

## 1.4 — Initialize Git in your project

In PowerShell, navigate to your project:
```
cd C:\CLAUDE_WORK\100-miles-100-days
```

Then run:
```
git init
git add -A
git commit -m "Initial commit"
```

You should see a bunch of files being added, then a message like `[main (root-commit) abc1234] Initial commit`.

## 1.5 — Push to GitHub

Go back to the GitHub tab from step 1.3. You'll see a section that says **"…or push an existing repository from the command line"** with three commands. Copy those three commands into PowerShell. They look like this (your URL will be different):

```
git remote add origin https://github.com/YOUR-USERNAME/100-miles-100-days.git
git branch -M main
git push -u origin main
```

The first time you push, a browser window will pop up asking you to authenticate with GitHub. Click "Authorize git-credential-manager" or similar. After that, future pushes are automatic.

When it finishes, refresh the GitHub page — you should see all your files there. ✅

> **Troubleshooting:** if `git push` errors with "Authentication failed", install GitHub Desktop (https://desktop.github.com) — it sets up auth automatically. Then just close GitHub Desktop and re-run the push command.

---

# PHASE 2 — Set up Supabase (30 min)

## 2.1 — Create the project

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Fill in:
   - **Organization:** click the dropdown, then "New organization" if you don't have one — name it whatever, "Personal" is fine
   - **Project name:** `100-miles-100-days`
   - **Database password:** click the **Generate a password** link. **Copy this password somewhere safe** (a password manager, or paste into a notes file you trust). You will rarely need it but losing it means restoring access requires support.
   - **Region:** **East US (North Virginia)** — closest to Missouri, fastest for users
   - **Pricing Plan:** **Free**
4. Click **Create new project**
5. Wait ~2 minutes. You'll see a spinner that says "Setting up project…" and then a dashboard appears.

## 2.2 — Run the database setup script

1. In the left sidebar of the Supabase dashboard, click the **SQL Editor** icon (looks like `</>`)
2. You'll see a page with a code editor. Click the **+ New query** button (top left), or the existing empty query
3. Open File Explorer, navigate to `C:\CLAUDE_WORK\100-miles-100-days\supabase\schema.sql`
4. Open `schema.sql` in Notepad (right-click → Open with → Notepad)
5. Press `Ctrl+A` then `Ctrl+C` to select all and copy
6. Click in the Supabase SQL editor, press `Ctrl+A` then `Ctrl+V` to paste
7. Click the green **Run** button in the bottom right (or press `Ctrl+Enter`)
8. Wait ~5 seconds. You should see **"Success. No rows returned."** in green at the bottom.

If you see errors instead, copy the error text and let me know — most likely a typo somewhere.

## 2.3 — Verify the tables exist

1. In the left sidebar, click **Table Editor** (looks like a spreadsheet icon)
2. In the dropdown at the top that says "schema", make sure **public** is selected
3. You should see these tables listed in the left panel:
   - `participants`
   - `activity_logs`
   - `community_submissions`
   - `resource_clicks`
   - `resource_sessions`
   - `announcements`
4. Click on **participants** — you should see 10 rows with codes 9001 through 9010, all with empty display_name and county. These are your demo codes.

## 2.4 — Grab your API keys

1. In the left sidebar, click the **gear icon** (Project Settings) at the very bottom
2. Click **API** in the settings menu
3. You'll see a page with two important values. Keep this tab open — you'll copy from here in Phase 3.
   - **Project URL** — looks like `https://xxxxxxxx.supabase.co`
   - **Project API keys** → under that, find `anon` `public` — a long string starting with `eyJ...`

> 🚨 **NEVER** copy the `service_role` `secret` key — that one bypasses all security and should never leave Supabase.

## 2.5 — Create your admin login

This is the email + password you'll use to log into `/admin` on the live site.

1. In the left sidebar, click **Authentication** (the person icon)
2. Click **Users** in the sub-menu
3. Click **Add user** → **Create new user**
4. Fill in:
   - **Email:** your real email address
   - **Password:** make one up (8+ characters, mix of letters/numbers)
   - **Auto Confirm User:** ✅ **toggle this ON** (otherwise you'd need to click an email link)
5. Click **Create user**
6. **Write down the email and password** — this is what you'll type to log into `/admin` later.

> If you want multiple MU Extension staff to be admins, repeat this for each of them — each gets their own user.

✅ Supabase is fully set up. Don't close any tabs yet.

---

# PHASE 3 — Deploy to Netlify (20 min)

## 3.1 — Connect Netlify to GitHub

1. Go to https://app.netlify.com/start
2. You'll see "Connect to Git provider" — click **Deploy with GitHub**
3. A GitHub popup will ask you to authorize Netlify. Click **Authorize Netlify**
4. You may then be asked which repos to give access to:
   - Either **All repositories** (easier) or
   - **Only select repositories** → pick `100-miles-100-days`
   - Click **Install & Authorize**

## 3.2 — Pick the repo

1. You'll see a list of your GitHub repos. Click **100-miles-100-days**
2. The "Site configuration" page appears. Netlify auto-detects your settings from `netlify.toml`, so the build command (`npm run build`) and publish directory (`dist`) should already be filled in. **Don't change them.**

## 3.3 — Add the Supabase env vars

This is the **critical step** that connects Netlify to Supabase.

1. Scroll down to **Environment variables** → click **Add environment variables** → choose **Add a single variable**
2. Add the first variable:
   - **Key:** `VITE_SUPABASE_URL` (must be EXACTLY this — case-sensitive, with `VITE_` prefix)
   - **Value:** paste the **Project URL** you copied in step 2.4
   - **Scope:** leave as "All scopes"
3. Click **Add another variable**
4. Add the second variable:
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** paste the **anon public** key you copied in step 2.4 (the long `eyJ...` string)
5. Double-check both variable names are EXACTLY right. A typo here means the site silently falls back to localStorage mode.

## 3.4 — Deploy!

1. Click the big **Deploy 100-miles-100-days** button at the bottom
2. You'll be taken to a page showing the build progress
3. Wait ~90 seconds. You'll see:
   - "Building" → "Processing" → **"Published"** ✅
4. At the top of the page, you'll see a generated URL like `https://elegant-tesla-1a2b3c.netlify.app`
5. Click that URL — your site opens!

## 3.5 — Smoke test the live site

Go through this checklist on your new live URL:

- [ ] Home page loads, shows the logo and stats
- [ ] Click **Log Miles** → enter code `9001` → should show "Welcome!" and ask you to pick a display name
- [ ] Pick a display name (e.g. `TestUser1`) and county (e.g. `Boone`) → click **Get Started**
- [ ] You should land on the Log form. Enter `2.5` miles for Walking → click **Log 2.5 Miles**
- [ ] You should see "Miles Logged!" confirmation
- [ ] Click **View My Progress** → you should see your 2.5 miles in the table
- [ ] Open Supabase → **Table Editor** → **participants** → find row 9001 → it should now have `TestUser1` and `Boone` filled in ✅
- [ ] Open Supabase → **Table Editor** → **activity_logs** → you should see your 2.5-mile entry ✅
- [ ] Click **Leaderboard** in nav → should show TestUser1 with 2.5 mi ✅
- [ ] Go to `https://your-netlify-url.netlify.app/admin` → log in with the email + password from step 2.5 → admin dashboard appears ✅

**If all 9 checkboxes pass, your production stack is working end-to-end.**

> **Troubleshooting:** if entering 9001 says "Code not found", your env vars are wrong. Go to Netlify → **Site configuration** → **Environment variables**, double-check the spelling, fix if needed, then **Deploys** tab → **Trigger deploy** → **Clear cache and deploy site**.

---

# PHASE 4 — Buy and connect a custom domain (30 min + DNS waiting)

You can absolutely launch on the free Netlify URL (`elegant-tesla-1a2b3c.netlify.app`), but a real domain looks far more professional.

## 4.1 — Pick a domain name

Some ideas (check availability at https://www.cloudflare.com/products/registrar/):
- `100miles100days.org` (recommended — clear, on-brand)
- `mo100miles.com`
- `move100mo.org`
- `100milesmo.com`

`.org` is appropriate for an educational/nonprofit feel. `.com` is the safest fallback.

## 4.2 — Buy the domain

**Recommended registrar: Cloudflare Registrar** — sells at exact wholesale price, no upsells, ~$10/year for `.com` or `.org`.

1. Go to https://dash.cloudflare.com/sign-up if you don't have a Cloudflare account
2. Once logged in, click **Domain Registration** → **Register Domains** in the left sidebar
3. Search for your domain. Add to cart. Check out.
4. Pay with credit card (~$10-12 for one year)
5. Cloudflare will email you a confirmation. The domain is yours within ~5 minutes.

> Alternative: **Porkbun** (similar pricing, weirder name, equally reliable). Avoid GoDaddy, Namecheap, and Network Solutions — they upsell aggressively.

## 4.3 — Connect the domain to Netlify

There are two ways. Cloudflare's is easiest.

### Option A — Use Cloudflare DNS (recommended)

If you bought through Cloudflare, the domain is already on Cloudflare DNS — just need to point it at Netlify.

1. In Cloudflare dashboard, click on your domain
2. Click **DNS** in the left sidebar
3. Click **Add record**, then add:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** paste your Netlify URL minus the `https://` (e.g. `elegant-tesla-1a2b3c.netlify.app`)
   - **Proxy status:** click the orange cloud to turn it gray (DNS only) — Netlify handles SSL itself
   - Click **Save**
4. Click **Add record** again, this time:
   - **Type:** `A`
   - **Name:** `@` (this means the root, like `100miles100days.org` with no www)
   - **IPv4 address:** `75.2.60.5` (Netlify's load balancer IP)
   - **Proxy status:** gray cloud (DNS only)
   - Click **Save**
5. Now go to Netlify → your site → **Domain management** → **Add custom domain**
6. Enter your domain (e.g. `100miles100days.org`) → click **Verify** → **Yes, add domain**
7. Netlify will detect the DNS records you set, then auto-provision a free SSL certificate. This takes 5-30 minutes.
8. Once it shows **Netlify DNS** with a green checkmark and **HTTPS** enabled, you're live!

### Option B — Use Netlify DNS

If you used a different registrar, this is simpler.

1. In Netlify → your site → **Domain management** → **Add custom domain** → enter your domain
2. Netlify will say "this domain doesn't appear to be using Netlify DNS" — click **Set up Netlify DNS**
3. Netlify gives you 4 nameservers like `dns1.p01.nsone.net` etc.
4. Go to your registrar's dashboard → DNS settings → change nameservers to the ones Netlify gave you
5. Wait 5 minutes to 24 hours for DNS propagation
6. When it's done, SSL provisions automatically

## 4.4 — Verify

Visit `https://your-domain.org` in a browser. You should see a green padlock 🔒 and your site loads. If it loads without the padlock, wait another 10 minutes — SSL takes a moment.

---

# PHASE 5 — Pre-launch checklist

Before you tell anyone about the site:

- [ ] Test all 10 demo codes (9001-9010) on the live URL
- [ ] Log into `/admin` from a fresh incognito window → verify auth works
- [ ] Post a test announcement in `/admin` → confirm it shows site-wide
- [ ] Dismiss the announcement on a regular page → confirm it stays dismissed
- [ ] Submit a test photo + a test story → approve both in admin → confirm they appear on `/community`
- [ ] Test on your phone (mobile responsive)
- [ ] Toggle EN ↔ ES in the navbar — verify translations work
- [ ] Click 3 resource cards → check Supabase `resource_clicks` table for rows
- [ ] Try logging in with WRONG admin password → should see "Invalid login credentials" error
- [ ] Try entering invalid code like `0001` → should see "Code not found"
- [ ] Take a screenshot of `/` and share with a colleague — make sure it loads for them too

---

# PHASE 6 — When PEARS registrations come in

When MU Extension exports the actual participant registrations from PEARS, you'll need to add them to Supabase.

## Easy method: CSV upload

1. From PEARS, export the registration data
2. Open the CSV in Excel
3. Trim it down to just these columns (in this exact order):

   | code | county |
   |------|--------|
   | 1001 | Boone |
   | 1002 | St. Louis |
   | 1003 | Greene |

   - `code` must be a 4-digit string, unique. You can assign these sequentially starting at 1001.
   - `county` should match Missouri county names (no "County" suffix).
   - Leave `display_name` blank — participants choose it themselves on first login.
4. Save as `participants.csv`
5. In Supabase → **Table Editor** → **participants** → click the **Insert** button → **Import data from CSV**
6. Upload your file. Click **Import**.

The participants can now register on the site using their assigned codes.

## Or via SQL (faster for big lists)

In **SQL Editor**, paste this and edit the values:
```sql
insert into participants (code, county) values
  ('1001', 'Boone'),
  ('1002', 'St. Louis'),
  ('1003', 'Greene'),
  -- ... add as many as you need
  ;
```

---

# Day-to-day operations

| Task | Where | How |
|---|---|---|
| Post a site-wide banner | `/admin` | Top section, "Site-wide Announcement" |
| Approve/reject photo or story | `/admin` | "Pending Submissions" |
| Ban a participant | `/admin` | "Display Name Moderation" → Ban button |
| Download data for PEARS reporting | `/admin` | "Export Data" → click any CSV button |
| Add new participants mid-challenge | Supabase Table Editor | Insert rows in `participants` |
| Browse database directly | Supabase | https://supabase.com/dashboard |
| See deploy history / rollback | Netlify | https://app.netlify.com → your site → Deploys |
| Make a code change | Locally edit, then `git push` | Netlify auto-deploys every push to `main` |

---

# Updating the site after launch

Every push to your `main` branch on GitHub triggers a Netlify deploy automatically. Workflow:

```
# Make changes locally in C:\CLAUDE_WORK\100-miles-100-days
git add -A
git commit -m "Describe your change"
git push
```

Within 2 minutes, the change is live. If something breaks, Netlify keeps every past deploy — go to **Deploys** tab, find the previous good one, click **Publish deploy** to roll back instantly.

---

# Costs

| Item | Monthly | Annual |
|---|---|---|
| Supabase free tier | $0 | $0 |
| Netlify free tier | $0 | $0 |
| Domain registration | — | ~$10 |
| **Total for the year** | | **~$10** |

Free tiers comfortably support 2,000 participants. If you cross into needing paid tiers (probably won't, but if you do):
- Supabase Pro is $25/mo, gets you daily backups + more storage
- Netlify Pro is $19/mo, gets you more bandwidth + better analytics

---

# Privacy & MU IT review

If MU IT asks about the system, here's the one-paragraph summary:

> **100 Miles, 100 Days** is a static React web app hosted on Netlify, backed by a Supabase Postgres database. We collect zero PII — the participant table stores only a 4-digit code (assigned by MU Extension staff), a user-chosen display name (alphanumeric, max 20 chars, profanity-filtered), and a Missouri county. Activity logs contain only a date, activity type, distance, and optional 200-char note — no IP address, geolocation, device fingerprint, or any identifier that could be traced to an individual. Row-level security policies enforce that anonymous clients can read aggregate leaderboard data but cannot read pending or rejected community submissions. Admin access is gated by Supabase Auth (email + password). All traffic is HTTPS via Let's Encrypt.

---

# When something breaks

| Problem | Where to look first |
|---|---|
| Site shows "Loading…" forever | Netlify env vars (VITE_SUPABASE_URL/KEY misspelled?) |
| Codes not working | Supabase Table Editor → `participants` table → does the code exist? |
| Admin login fails | Supabase → Authentication → Users → does your user exist? |
| Build failed on push | Netlify Deploys tab → click the failed build → read the log |
| Site totally down | Netlify status: https://www.netlifystatus.com |
| Database down | Supabase status: https://status.supabase.com |

---

# Things to add after launch (optional)

These aren't blockers but would polish the experience:

1. **Error monitoring** — add Sentry (5 min, free tier).
2. **Privacy-friendly analytics** — Plausible ($9/mo) or Fathom.
3. **Custom email templates** — Supabase → Authentication → Email Templates — customize the admin invite emails to look on-brand.
4. **Daily database backup** — paid Supabase tier; or run a weekly `pg_dump` manually.
5. **PEARS-to-Supabase automation** — script that polls PEARS API and syncs new participants automatically.
6. **MU Extension–branded subdomain** — when you're ready, request `100miles.extension.missouri.edu` from MU Web Communications and add it as a domain alias in Netlify (your other domain still works).

---

**That's it. Once you finish Phase 1-5, you're production live.**

If you hit any snag, the most common ones are:
- **Wrong env var names** in Netlify (must be EXACTLY `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, case-sensitive)
- **Auto Confirm User** toggle off when creating admin (then you can't log in)
- **DNS propagation** taking time (just wait — up to 24h, usually <1h)

Send me any error messages and I'll help debug.
