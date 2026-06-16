# 100 Miles, 100 Days — Data Dictionary

**For:** research / analysis use
**Challenge window:** June 16 – September 24, 2026
**Last updated:** June 2026

This document describes every data field collected by the *100 Miles, 100 Days*
web app, how the tables relate, and how to obtain and interpret the exported data.

---

## 1. Privacy & what is (and isn't) collected

The app's database (and therefore this exported dataset) stores **no direct personal
identifiers**: there are **no** real names, emails, phone numbers, addresses, birthdates,
IP addresses, or geolocation in the data.

Each participant is identified only by a **4-digit code** assigned by MU Extension staff at
registration. Within this dataset the code is **pseudonymous** — it carries no direct
identifiers on its own.

> **Re-identification caveat (important for IRB / data-handling):** the code is *not*
> truly anonymous. MU Extension maintains a **separate mapping** (in its PEARS registration
> system) between each code and the registrant's contact details, including email. Authorized
> staff can therefore re-link a code to an individual. Treat this dataset as **pseudonymized,
> not anonymized**, and store/share it accordingly (e.g., don't combine it with the PEARS
> mapping outside an approved, secured workflow).

---

## 2. Tables

The data is **relational and in "long" format** (one row per event), which is ideal for
analysis in R, Python (pandas), or Excel pivot tables.

### 2.1 `participants` — one row per registered person

| Column | Type | Description | Notes |
|---|---|---|---|
| `code` | text (4 chars) | Anonymous participant ID. **Primary key.** | Assigned by staff. Join key for all other tables. |
| `display_name` | text (≤20 chars) | Self-chosen nickname shown on the leaderboard. | `NULL` until the person registers. No real names (validated + profanity-filtered). |
| `county` | text (≤50 chars) | Missouri county the participant selected. | `NULL` until registration. One of the 114 MO counties (+ St. Louis City). |
| `team_id` | uuid | The team the participant joined at sign-up. **Foreign key → `teams.id`.** | `NULL` = "flying solo" (no team). See §6. |
| `banned` | boolean | Whether staff has banned this code from logging. | Default `false`. Banned rows are excluded from leaderboards. |
| `created_at` | timestamp (UTC) | When the code row was created (usually the bulk import date). | Not the registration time. |

> **Registered vs. unregistered:** a row with `display_name = NULL` is a code that was
> issued but never activated by a participant. Exclude these (`display_name IS NOT NULL`)
> for any analysis of *active* participants.

### 2.2 `activity_logs` — one row per logged activity

| Column | Type | Description | Notes |
|---|---|---|---|
| `id` | uuid | Unique row ID. **Primary key.** | |
| `participant_code` | text (4 chars) | The participant who logged it. **Foreign key → `participants.code`.** | Join here to get county/team. |
| `date` | date | The date the activity occurred (participant-entered). | Constrained to 2026-06-16 … 2026-09-24. |
| `activity_type` | text | The activity category. | See controlled list in §3. |
| `miles` | decimal(6,2) | Miles credited toward the 100-mile goal. | **Self-reported.** Range `> 0` and `≤ 50.00` per entry. |
| `notes` | text (≤200 chars) | Optional free-text note. | May be `NULL`. |
| `created_at` | timestamp (UTC) | When the entry was submitted. | May differ from `date`. |

> **Important on `miles`:** values are **self-reported** and may include minutes-to-miles
> or steps-to-miles conversions the participant did themselves (guidance shown in-app:
> 20 minutes of activity = 1 mile; 2,000 steps = 1 mile). Treat as participant-estimated,
> not device-measured.

### 2.3 `community_submissions` — moderated photos & stories (optional for research)

| Column | Type | Description | Notes |
|---|---|---|---|
| `id` | uuid | Primary key. | |
| `type` | text | `'photo'` or `'story'`. | |
| `content` | text | Base64 image data (photos) or the story text (stories). | Photos are large; usually not needed for analysis. |
| `caption` | text (≤200) | Photo caption. | May be `NULL`. |
| `display_name` | text | Submitter's nickname. | Stored for moderation; **not shown publicly**. |
| `county` | text | Submitter's county. | |
| `status` | text | `'pending'`, `'approved'`, or `'rejected'`. | Only `approved` appears on the public wall. |
| `submitted_at` | timestamp (UTC) | Submission time. | |

### 2.4 `resource_clicks` & `resource_sessions` — aggregate resource analytics

No participant identifiers are attached — these are **anonymous engagement counts** only.

| Column | Type | Description |
|---|---|---|
| `resource_id` | integer | Internal ID of the article/podcast/program. |
| `resource_name` | text | Human-readable resource name. |
| `clicked_at` / `recorded_at` | timestamp (UTC) | When the click/session happened. |
| `duration_seconds` | integer | (sessions only) Time spent on the resource. |

---

## 3. Controlled vocabulary — `activity_type`

```
Walking, Running, Hiking, Biking, Swimming, Dancing,
Strength Training, Yoga, Wheelchair Rolling, Gardening,
Pickleball, Basketball, Other
```

---

## 4. How the tables join

```
participants.code  ←──  activity_logs.participant_code   (1 participant → many logs)
```

To analyze miles by county (or team), join each activity log back to its participant:

```sql
select p.county, sum(l.miles) as total_miles, count(distinct p.code) as people
from activity_logs l
join participants p on p.code = l.participant_code
where p.banned = false and p.display_name is not null
group by p.county
order by total_miles desc;
```

---

## 5. Getting the data (CSV exports)

The admin dashboard (`/admin`) exports CSV files for:
1. **Participants** — the `participants` table (includes each person's team name).
2. **Activity logs** — the `activity_logs` table.
3. **Leaderboard** — per-participant totals (`code`, `display_name`, `county`, `total_miles`).
4. **County stats** — per-county participant counts and mile totals/averages.

Each file is named with the export date. Open in Excel or load directly into R/pandas.

> For a single pre-joined file (each activity log already carrying the participant's
> county and team), ask the developer to enable the **combined export** — this saves you
> the manual join step.

---

## 6. Teams / groupings

Teams are a self-selected grouping captured at sign-up. The structure:

### 6.1 `teams` — one row per team

| Column | Type | Description | Notes |
|---|---|---|---|
| `id` | uuid | **Primary key.** | Join key for `participants.team_id`. |
| `name` | text (≤40 chars) | Team display name. | Case-insensitively unique (validated + profanity-filtered). |
| `created_at` | timestamp (UTC) | When the team was created. | |

### 6.2 `team_id` on `participants`

A nullable **`team_id`** column on `participants` (**foreign key → `teams.id`**).
`team_id IS NULL` means the participant is **"flying solo"** (no team).

During registration, after choosing a display name and county, each participant
**searches the existing teams and joins one, creates a new one, or skips (flies solo)**.
A participant who flew solo can **join (or create) a team later from the My Progress
page** — any miles already logged then count toward that team. Once on a team,
**switching** teams is staff-only (to prevent team-hopping); MU Extension staff can
rename a team, merge duplicates, delete a team, or reassign an individual to fix
mistakes. Deleting or merging a team never deletes anyone's logged miles; former
members simply revert to solo (or move to the merge target).

### 6.3 Grouping by team

Every activity log can be grouped by team via the existing
`activity_logs.participant_code → participants.code → participants.team_id` chain:

```sql
select t.name as team, sum(l.miles) as total_miles,
       count(distinct p.code) as members
from activity_logs l
join participants p on p.code = l.participant_code
join teams t        on t.id = p.team_id
where p.banned = false and p.display_name is not null
group by t.name
order by total_miles desc;
```

A pre-aggregated **`team_leaderboard`** view (`team_id`, `team_name`, `members`,
`total_miles`, `avg_miles`) is also available and powers the public leaderboard's
"By Team" tab.

**Note for grouping method:** because teams are self-selected at registration (not
pre-assigned), team membership is fixed at sign-up and stored per participant. Analysis
can group *post-hoc* by `team_id`, `county`, `activity_type`, or week with no additional
data collection. Participants with `team_id IS NULL` (solo) can be analyzed as their own
"no team" category or excluded, as the research question requires.

---

## 7. Caveats for analysis

- **Self-reported data** — miles are participant-entered estimates, capped at 50/entry.
- **Voluntary logging** — absence of a log ≠ absence of activity; it means it wasn't recorded.
- **Display names are non-unique-ish** — use `code` as the identifier, never `display_name`.
- **Timestamps are UTC** — convert to Central Time if day-of-week analysis matters.
- **Exclude unregistered codes** (`display_name IS NULL`) and **banned** rows from participant analyses.
