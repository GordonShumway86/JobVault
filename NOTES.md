# Project Notes

Running log of what's been built, what's mocked, and what's next — so a
future session (or you) can pick this back up without re-deriving context.

---

## 2026-09-24 — Phase 1 built

### What it is
Personal PWA for HVAC/refrigeration field service records — customers,
sites, equipment, jobs, photos, follow-ups. Mobile-first (iPhone + Windows),
free to run, works offline and syncs when back online.

### Repo state
- Branch: `claude/service-log-hvac-app-ssx82g`
- Commit: `ac490be` — pushed, everything committed, nothing left uncommitted.

### Stack (all free tier)
- Vite + React + TypeScript + Tailwind v4, installable as a PWA
- Supabase (Postgres + Auth + Storage) as the backend
- Dexie/IndexedDB for local-first cache + background sync queue — app works
  fully offline (create jobs, take photos, etc.) and pushes/pulls whenever a
  connection comes back
- OCR/nameplate scanning will reuse the free, on-device Tesseract.js approach
  from `github.com/GordonShumway86/Model-Photo-to-Manual-Lookup` (camera
  capture -> crop/contrast -> Tesseract.js OCR -> regex extraction, 100%
  client-side, no API key, no per-scan cost)

### What's done (Phase 1) — verified working in-browser, no console errors
- Auth (Supabase email/password, single owner)
- Full relational schema: customers, sites, equipment, jobs, job activity,
  photos/attachments, parts, quotes, vendor docs, diagnostic readings,
  follow-ups, user settings — owner-scoped RLS, ready to extend to teams later
- Dashboard (today's calls, waiting-on-approval/parts, return visits, search)
- New Call flow: pick or create customer -> site -> equipment inline, in one
  fast form
- Jobs list with search/filter (status, call type)
- Job detail: activity timeline, notes, photo capture/upload (categorized,
  internal-only flag), 16 job statuses, follow-up tasks
- Customer / Site / Equipment CRUD + full linked history
- Photo upload to private Supabase Storage (signed URLs, never public)
- Installable PWA (manifest, icons, offline app-shell caching)

### What's mocked / not built yet
- Parts, Quotes, Diagnostic Readings: DB tables + types exist, no screen UI yet
- Job numbers are generated on-device (`SL-YYMMDD-XXX`) so offline creation works
- Settings covers pricing defaults/quote language; custom type lists have no
  editor UI yet

### Left out (would cost money)
- AI-drafted polished service-report prose from rough field notes — the only
  piece that really wants a paid LLM API. Optional, skippable, plugs in later
  behind an abstraction layer without touching anything else.
- PDF export / e-signature (Phase 3) — free to build, just not done yet.
- Payments, calendar dispatch, accounting sync, customer portal, multi-tech
  permissions — intentionally out of scope per the spec, DB left ready for it.

### Next steps (Phase 2)
1. Nameplate photo -> OCR review screen (Tesseract.js, reusing the
   Model-Photo-to-Manual-Lookup pattern)
2. Vendor quote/receipt OCR review (same free pipeline)
3. Voice-to-text notes (Web Speech API, free/built-in)
4. Parts tracking UI + Quote Builder
5. AI-generated editable service summary (the one paid-API-optional feature)

### To pick this back up
- Full setup instructions (create free Supabase project, run the 2 migration
  files, env vars, deploy to Vercel for free, install on iPhone/Windows) are
  in `README.md`.
- Was about to: create the Supabase project and run migrations, OR jump
  straight into Phase 2 nameplate OCR — not yet decided.

---

## 2026-09-24 (later) — Supabase wired up

- Reused an existing empty Supabase project (`ed95667@gmail.com's Project`,
  ref `bxagejspufjuffadxkkl`) rather than creating a new one — confirmed it
  had zero tables/types/migrations before reusing it, so no conflict.
- Ran `0001_init.sql` and `0002_storage.sql` against it via the Supabase MCP
  connector (all 13 tables created, RLS enabled on every one).
- Fixed two minor Supabase linter warnings (function search_path, pg_trgm
  extension location) in a follow-up `0003_lint_fixes` migration — not saved
  as a file in `supabase/migrations/` yet, just applied directly. If you want
  it version-controlled, ask to have it added as a migration file.
- `.env.local` created locally with the real Project URL + anon key (this
  file is git-ignored — it does NOT get pushed to GitHub, by design, since it
  has your credentials).
- Verified in-browser: app now shows the real Sign In screen instead of the
  "not configured" warning — Supabase connection confirmed working.

**Next when you resume**: sign up for your one owner account from the app's
Sign In screen (any email/password — this is a single-user app, so whatever
you pick becomes THE account), then start creating real customers/jobs.
