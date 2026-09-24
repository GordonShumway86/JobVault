# Service Log

A mobile-first, installable field-service record app for an HVAC & refrigeration
technician. Personal use, zero required monthly cost. Works fully offline and
syncs to your own free Supabase project when you have a connection.

## Tech stack (and why)

| Piece | Choice | Why |
|---|---|---|
| UI | React + TypeScript + Vite | Fast dev loop, installable PWA, works great on iPhone Safari and desktop Chrome/Edge |
| Styling | Tailwind CSS v4 | Fast to build a consistent, high-contrast, large-touch-target UI |
| Backend | Supabase (Postgres + Auth + Storage) | Free tier covers a single-user app easily; real relational DB with row-level security; free file storage for photos |
| Offline / local-first | Dexie (IndexedDB) | Every read comes from the device first, so the app works with zero signal; a background queue pushes changes to Supabase when you're back online |
| OCR (nameplates, receipts) | Tesseract.js, client-side | 100% free, runs entirely on-device, no API key, no per-scan cost — same approach used in your `Model-Photo-to-Manual-Lookup` repo |
| Voice dictation | Browser Web Speech API | Free, built into iOS Safari & Chrome, no server round-trip |
| PWA | vite-plugin-pwa | Installable to iPhone home screen and Windows, offline app-shell caching |

**Nothing in this stack requires a paid subscription.** See "What was left out" below for the one AI feature that would need a paid key if you ever want it.

## Project layout

```
src/
  auth/        PinGate (the actual lock screen) + auto-login session context
  components/  Shared UI (bottom nav, cards, form fields, photo widgets)
  lib/
    db.ts       Dexie (IndexedDB) schema — the local-first cache + outbox
    sync.ts     Push queued writes to Supabase, pull fresh rows down
    repo.ts     saveRecord/deleteRecord — every screen writes through here
    supabase.ts Supabase client
  screens/     One file per screen (Dashboard, JobDetail, CustomerForm, ...)
  types/       TypeScript types mirroring the SQL schema
supabase/
  migrations/  SQL migrations (run these against your Supabase project)
  seed.sql     Optional sample data for local development
```

## How offline-first works

Every screen reads from **IndexedDB** via `dexie-react-hooks`, not directly from
Supabase — so the UI is instant and works with no signal at all. When you save
something, it's written to IndexedDB immediately and a "mutation" is queued.
A background loop (every 30s, and whenever the browser fires an `online`
event) pushes queued mutations to Supabase and pulls down anything new. If
you're offline, writes just pile up in the queue — nothing is lost, and the
"More" tab shows how many changes are waiting to sync.

Photos work the same way: the image blob is stored locally right away, and
the *upload* to Supabase Storage happens as part of that same sync pass once
you're online.

## Access & security model

This app has **no traditional login** — no username/password form, no
"forgot password," nothing to get locked out of. Instead there are two
layers:

1. **Auto-login.** The app signs itself into one fixed Supabase account
   automatically, every time it loads. This is real auth under the hood
   (row-level security still scopes every query to that one account), but
   it's invisible — you never see it or type anything for it.
2. **PIN screen.** Because this is a client-side app, the auto-login
   credentials above are unavoidably baked into the deployed site's code —
   anyone who found the URL and opened browser dev tools could read them
   out. So the PIN screen (`src/auth/PinGate.tsx`) is the *actual* gate:
   type the PIN once per device, it's checked against a stored hash (never
   the PIN itself) with no server round-trip, and it's remembered from then
   on. Type it wrong and it just says so — instantly, no lockout, no limit
   on attempts.

**Be honest with yourself about what this protects against**: it stops
casual snooping (someone stumbling on the link, or browsing this public
GitHub repo). It is *not* strong security — a determined attacker who gets
the deployed URL could still dig the credentials out of the site's code. For
a personal app that isn't shared or advertised anywhere, that's a reasonable
trade. If that changes (you want to share access, or the data becomes more
sensitive), revisit this before that happens.

To change the PIN: generate a new hash and update `VITE_APP_PIN_HASH`
(locally and wherever it's deployed):
```bash
node -e "console.log(require('crypto').createHash('sha256').update('NEWPIN').digest('hex'))"
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of `supabase/migrations/0001_init.sql`,
   then `supabase/migrations/0002_storage.sql`.
3. In Settings → API, copy your **Project URL** and **anon public key**.

### 3. Create your app account (no login screen)

This app has no visible sign-in — it logs itself in automatically every
time it opens, using one fixed account. There's nothing to type and nothing
to get locked out of.

1. In Supabase, go to Authentication → Users → **Add user**.
2. Pick any email (it doesn't need to be real — e.g. `owner@example.com`)
   and a long random password.
3. Check **Auto Confirm User** so it doesn't wait on an email you'll never
   get.

### 4. Pick a PIN

This is the screen you'll actually see and type into. Pick 4–8 digits, then
hash it:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PIN').digest('hex'))"
```

### 5. Configure environment variables

```bash
cp .env.example .env.local
# edit .env.local with your Project URL, anon key, the email/password from
# step 3, and the PIN hash from step 4
```

### 6. (Optional) Seed sample data

Copy your account's UUID from Authentication → Users, then:

```bash
psql "$DATABASE_URL" -v owner="'<paste-user-uuid-here>'" -f supabase/seed.sql
```

(Skip this — the app works fine with zero data; you'll just be creating your
first real customer/job instead of sample ones.)

### 7. Run it

```bash
npm run dev
```

Open the printed local URL, enter your PIN, and it signs itself in and goes
straight to the Dashboard.

### 8. Install it on your devices

- **iPhone**: open the deployed URL in Safari → Share → *Add to Home Screen*.
- **Windows 11**: open it in Edge or Chrome → the install icon appears in the
  address bar → *Install*.

For it to be reachable from your phone *and* your laptop, deploy it somewhere
with a stable URL — the easiest free option is
[Vercel](https://vercel.com) (`npm run build` produces a static `dist/`
folder; Vercel's free tier hosts static/Vite sites with no cost). Point
Vercel's project environment variables at the same `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`.

Because the app is local-first, once it's loaded once on a device it keeps
working without a network connection — new jobs, notes, and photos queue up
and sync automatically next time you have signal.

## What's complete (Phase 1)

- Auto-login (no login *form*) backed by a PIN lock screen — one fixed
  Supabase account backs the whole app with real auth + row-level security
  under the hood, and a simple client-side PIN (hashed, no lockout, no
  server round-trip) is the actual gate against casual access to the
  deployed site — see "Access & security model" above
- Full relational schema: customers, sites, equipment, jobs, job activity,
  photos/attachments, parts, quotes, vendor documents, diagnostic readings,
  follow-up tasks, user settings — with row-level security scoped by owner
  (ready to extend to teams/orgs later without a rebuild)
- Dashboard: today's calls, waiting-on-approval / waiting-on-parts / return-visit
  counts, open jobs list, quick search
- New Call flow: pick or create customer → site → equipment inline, call type,
  priority, schedule, complaint — all in one fast, section-based form
- Jobs list: search by job #, customer, site, address, model/serial, notes;
  filter by status and call type
- Job detail: activity timeline, add notes, take/upload photos (categorized,
  internal-only flag), change status (16 statuses), schedule & complete
  follow-up tasks
- Customer / Site / Equipment: full CRUD + detail pages showing complete
  linked history (a piece of equipment shows every job, photo, and note ever
  logged against it)
- Photo capture/upload to private Supabase Storage (signed URLs only, never
  public), with local-first queueing so photos taken offline upload later
- Full offline-first sync engine (write queue + background push/pull)
- Installable PWA with app icon, manifest, offline app-shell caching

## What's mocked / simplified for now

- **Parts, Quotes, Diagnostic Readings**: the database tables and TypeScript
  types are fully built (so nothing needs to change later), but there's no
  screen UI for them yet — that's the first item in Phase 2.
- **Job numbers** are generated on-device (`SL-YYMMDD-XXX`) so job creation
  works fully offline; they're not a strictly sequential counter.
- Settings screen covers pricing defaults and quote language; custom call
  types/equipment types/photo categories are stored but have no editor UI yet.

## Phase 2 — next up

1. **Nameplate photo → OCR review** — reuse the exact approach from your
   `Model-Photo-to-Manual-Lookup` repo (Tesseract.js running client-side,
   crop-to-reticle + contrast preprocessing, regex extraction), extended to
   propose manufacturer/model/serial/voltage/phase/MCA/MOCP, with an editable
   review screen before anything is saved.
2. **Vendor quote/receipt OCR review** — same free Tesseract.js pipeline,
   tuned to pull vendor name, date, totals, and line items.
3. **Voice-to-text notes** — Web Speech API (free, built into the browser) for
   dictating complaints/notes/diagnoses in the field.
4. **Parts tracking UI** (table already exists) and **Quote Builder** (line
   items, internal cost vs. customer-facing view, already-modeled totals).
5. **AI-generated editable service summary** — this is the one feature that
   benefits from a real LLM (turning rough notes into a clean report). See
   below.

## What had to be left out (would require a paid service)

Everything in Phase 1 and the Phase 2 plan above runs at **zero ongoing cost**
(Supabase free tier + on-device OCR/speech). The one place a paid API would
genuinely help is:

- **AI-drafted professional service-report summaries** (turning your rough
  field notes into polished customer-facing report language). Regex/local
  OCR can extract *structured* data for free, but writing fluent prose from
  messy notes needs an LLM. This is **optional and skippable** — you can
  always write/edit the summary by hand, which the design already assumes
  ("technician must be able to edit it before it's customer-visible"). If you
  ever want it, it plugs in as a bring-your-own-API-key call (e.g. to Claude
  or OpenAI, pennies per report) behind the existing AI abstraction layer —
  nothing else in the app needs to change.
- **PDF export / e-signature capture** (Phase 3) — doable for free with
  in-browser libraries, just not built yet.
- Everything explicitly out of scope per the spec (payments, calendar
  dispatch, accounting sync, customer portal, multi-technician permissions)
  stays out, by design, with data structures left ready for later.

## Database schema

See `supabase/migrations/0001_init.sql` for the full schema (14 tables) and
`src/types/index.ts` for the matching TypeScript types. Every table carries
an `owner_id` so a future multi-user/organization model is a policy change,
not a rebuild.
