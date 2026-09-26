# Project Notes

Running log of what's been built, what's mocked, and what's next — so a
future session (or you) can pick this back up without re-deriving context.

## Don't repeat these (read this section, full stop)

Concrete mistakes already made and fixed once this project. Each one cost
real time or created a real bug — check this list before doing any of the
following again, rather than skimming past it.

- **Never write a real secret (password, PIN, API key) into any file that
  gets committed to this repo.** It's public on GitHub. Secrets belong in
  `.env.local` (gitignored) or in the hosting platform's environment
  variable settings — nowhere else. This was caught twice: once when a
  real PIN got typed into this file (see 2026-09-24 "Added a PIN screen"),
  and once when a real password almost got hardcoded into
  `AuthContext.tsx` to work around a flaky deployment form (see
  2026-09-24 "Deployed to Vercel" step 4) — a safety check in the harness
  blocked that one before it was committed.
- **When Vercel environment variables need to change, use the Vercel MCP
  connector's `edit_project_env` directly.** Don't ask Ed to hand-edit
  them through Vercel's mobile website if it can be avoided — that UI has
  real problems (values marked "Secret" are write-only and can't be
  re-checked, the list re-sorts after every edit so the wrong row can get
  tapped, and it's easy to accidentally paste a multi-line block into a
  single field). Full story: 2026-09-24 "Deployed to Vercel."
- **After changing Vercel env vars, always trigger a genuinely fresh build**
  — `create_deployment` with `gitSource` + `forceNew: 1`. Never rely on
  "redeploy an existing deployment" (`deploymentId` alone) when env vars
  changed — it can silently serve a stale build that doesn't reflect the
  new values. This exact gap once let the PIN screen get bypassed
  entirely. Full story: 2026-09-24 "Deployed to Vercel," step 7.
- **This app deliberately has no traditional login.** Auto-login (one
  fixed Supabase account, invisible to Ed) plus a client-side PIN gate is
  the intended design, already discussed and agreed with Ed after he
  specifically said he never wants to risk getting locked out by a broken
  login. Don't propose adding a real sign-in form back.
- **Never write the actual PIN in plaintext anywhere in this repo**,
  NOTES.md included — only its SHA-256 hash belongs in version-controlled
  files (and only in `.env.local`, which is gitignored, not committed).
  Ask Ed directly if you need the current PIN.
- **This sandbox cannot reach Supabase, Vercel, or the Tesseract.js CDN
  directly** — outbound requests to those hosts get denied by network
  policy. That's expected, not a bug to chase. Use the Supabase and
  Vercel MCP connectors (not curl/fetch/a local browser) for any backend
  or deploy work, and know that OCR accuracy can only be verified for
  real on Ed's own phone with real internet.
- **Ed has no coding background.** Explain technical steps in plain
  language, and prefer doing things directly (via a connector, via code)
  over asking him to perform multi-step technical actions in a web UI.

## Quick facts

- Repo: `github.com/GordonShumway86/JobVault`, branch
  `claude/service-log-hvac-app-ssx82g` (this is also the repo's default
  branch — there is no separate `main` to diff against).
- Live app: `job-vault-six-mu.vercel.app` (PIN required — ask Ed).
- Supabase project: `bxagejspufjuffadxkkl` (ref `ed95667@gmail.com's
  Project` in the dashboard).
- Vercel project: `job-vault`, id `prj_EmUm0QrpEMp1rq2uh3wxWrmlqbIh`.
- Both the Supabase and Vercel MCP connectors were connected in Ed's
  claude.ai account as of 2026-09-25 — a new session may already have
  them available, or may need Ed to reconnect them (Settings →
  Connectors) if they don't show up.

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

---

## 2026-09-24 (later still) — Removed the login screen

Ed doesn't want a login screen — bad past experiences with getting locked
out by password issues on other apps. Changed the auth model:

- The app now logs itself in **automatically**, every time it opens, using
  one fixed account. There is no login UI anymore (`src/auth/Login.tsx`
  deleted). Nothing to type, nothing to get locked out of.
- Still real Supabase auth + row-level security under the hood — the
  account is just invisible to Ed. Credentials live in `.env.local`
  (`VITE_APP_EMAIL` / `VITE_APP_PASSWORD`), which stays out of GitHub.
- Created the one owner account (`owner@service-log.app`, random 32-char
  password) directly in the Supabase database via the Supabase MCP
  connector (this sandbox's network blocks the Supabase Auth API directly,
  so went through the DB instead — verified the password hash matches
  before wiring it up).
- **Known tradeoff, discussed with Ed and accepted**: since there's no
  password gate, anyone who gets the app's web link could see the data too.
  Fine for personal, not-publicly-shared use — revisit if that changes.
- Could not fully live-test the auto-login from this sandbox (its own
  network policy blocks `supabase.co` — confirmed via a direct curl test,
  not an app bug). Verified instead: TypeScript compiles clean, production
  build succeeds, the account's password hash checks out in the database,
  and the error-handling path renders correctly when the network call fails.
  **Real live-device test still needed** — first thing to check once this
  is opened on an actual phone/laptop with normal internet access.

**Next when you resume**: open the deployed (or locally running) app and
confirm it lands straight on the Dashboard with no login prompt at all.

---

## 2026-09-24 (even later) — Added a PIN screen; repo confirmed public

Ed asked a sharp question: the GitHub repo is public — can someone read the
login off it? Checked: **no**, `.env.local` (the real credentials) was
never committed, only a fake placeholder in `.env.example`. But that led to
a more important gap: this is a client-side-only app, so once deployed, the
auto-login credentials get baked into the site's own JavaScript — anyone
who opens the live URL and digs into browser dev tools could read them out
directly, not just view data through the app. The real protection was
"nobody knows the URL," which is weak given this holds customer PII.

Fix: added `src/auth/PinGate.tsx` — a simple PIN entry screen in front of
the whole app (wraps everything in `main.tsx`, before routing/auth). No
account, no server-side check, no lockout: it hashes (SHA-256) whatever you
type and compares it to a stored hash client-side. Wrong PIN just says "try
again," instantly, no rate limit — can't get locked out. Right PIN sets a
flag in the browser's local storage and it won't ask again on that device.

- The PIN itself is NOT recorded here (this repo is public) — only its
  SHA-256 hash lives in `.env.local` / the built app. See `.env.local` for
  the current hash; ask Ed if you need to know the actual PIN.
- Verified end-to-end in-browser: wrong PIN rejects and lets you retry
  immediately, correct PIN unlocks, and it stays unlocked after a reload
  (checked via automated browser test, screenshots taken).
- Repo stays public (Ed didn't ask to change that) — fine now, since the
  PIN is the actual gate, not obscurity of the GitHub repo or the URL.
- To change the PIN later: `node -e "console.log(require('crypto').createHash('sha256').update('NEWPIN').digest('hex'))"`,
  put the result in `VITE_APP_PIN_HASH` in `.env.local` (and wherever it's
  deployed), rebuild/redeploy.

---

## 2026-09-24 (evening) — Two-agent review, then real deployment to Vercel

### Code + security review (Ed's request: "spin up two agents")

Ran the `code-review` and `security-review` skills against the whole
codebase (no separate base branch to diff against — this repo's only
branch is the feature branch, so reviewed everything from scratch via
sub-agents).

**Code review found a real problem**: I had written the actual PIN
("349871" at the time) in plaintext into this NOTES.md file, in a public
repo — completely defeating the PIN gate the same commit introduced.
Fixed by redacting it from the file going forward (see entry above), and
separately by rotating the PIN itself, since editing a file doesn't erase
it from git history in a public repo (confirmed: the old PIN is still
recoverable from history; it's just dead/useless now since it's rotated).
Also added a "Lock App" button (`lockApp()` in `PinGate.tsx`, wired into
More) — there had been no way to re-lock the app on a device once
unlocked.

**Security review**: no SQL injection, XSS, or auth-bypass found. RLS
(row-level security) policies and the PIN/auto-login logic are sound for
today's single-account reality. One real but low-urgency design gap
logged for whenever a second account ever exists: the database doesn't
yet cross-check that related records (e.g. a part on a job) belong to the
same owner as the job itself — harden this before any multi-user future,
not urgent now.

### PIN rotation

Old PIN retired. **Current PIN: not written anywhere in this repo or in
Google Drive notes, by design** — it lives only as a SHA-256 hash in
`.env.local` (gitignored) and in Vercel's environment variables. Ask Ed
directly if you need it. Verified by searching the *entire* git history
(`git log -p --all`) for both the old and new PIN strings — old one shows
up (harmless, retired), new one has zero matches anywhere.

### Deployed to Vercel — a long, bumpy road, now resolved

Ed connected Vercel (GitHub-linked) and imported the repo himself through
the mobile site — walked him through: branch selection
(`claude/service-log-hvac-app-ssx82g`), environment variables, skipping
the "Supabase" Vercel marketplace integration (would have created a
second, unwanted Supabase project), and clicking Create Project → Deploy.

**What went wrong (all now fixed)**:
1. First attempt: Ed pasted a multi-line block of `KEY=VALUE` pairs into
   a single Value field instead of one value per field — corrupted the
   Supabase anon key with trailing garbage, causing an "invalid
   Authorization header" error.
2. Vercel's mobile UI made this hard to fix: env vars marked "Secret" are
   write-only (can't be viewed after saving, even by the person who set
   them) and the list re-sorts by "Last Updated" after every edit, so
   tapping a row right after editing another one could land on the wrong
   row. Worked around by deleting and re-adding all 5 vars one at a time,
   switching type from "Secret" to "Config" (Vercel's own suggestion,
   since `VITE_`-prefixed vars are public in the bundle regardless of
   that label).
3. Even after careful redo, `VITE_APP_EMAIL` / `VITE_APP_PASSWORD` kept
   failing Supabase's login check ("Invalid login credentials") despite
   Ed confirming the values looked right on-screen and copy-pasting
   (never hand-typing) throughout. Verified server-side twice via the
   Supabase MCP connector that the account and password hash were
   genuinely correct — the corruption was happening somewhere in
   Vercel's mobile form, never fully diagnosed at the character level.
4. **I almost made a real mistake here**: to route around the flaky
   mobile form, I started hardcoding the real password directly into
   `AuthContext.tsx` — which would have put a live secret straight into
   this **public** GitHub repo's source, the exact class of mistake
   already caught once with the PIN. A safety check in the harness
   blocked the next command and flagged why before it got committed.
   Reverted immediately (confirmed `git diff` was clean after). Lesson:
   don't solve "hard to enter via a form" by hardcoding into version
   control just because the value already ends up in the public JS
   bundle either way — those are different exposure surfaces (repo
   history is permanent and human-browsable; the bundle isn't
   source-searchable on GitHub).
5. Real fix: rotated `VITE_APP_PASSWORD` to a simpler value (all
   lowercase letters + digits, no mixed case or underscores — much less
   prone to mobile keyboard/clipboard corruption), updated it directly in
   Supabase via SQL (verified the hash matches), and had Ed connect the
   **Vercel MCP connector** (`claude.ai` → Settings → Connectors) so I
   could read/write the project directly instead of guiding mobile taps.
6. Using the Vercel connector, overwrote all 5 environment variables
   directly via `edit_project_env` (bypassing the mobile form entirely)
   and confirmed each one server-side.
7. **Found one more real bug**: my first attempt to apply the fix used
   Vercel's "redeploy an existing deployment" API, which apparently
   doesn't reliably rebuild with the *current* environment variable
   values (behaved like it reused a stale build). Ed tested and got
   auto-logged straight past the PIN screen with no prompt at all — a
   real access-control bug, not expected behavior. Root cause: if
   `VITE_APP_PIN_HASH` is empty at build time, `PinGate.tsx` intentionally
   skips the gate ("don't lock anyone out over a setup gap") — so a stale
   build without that value baked in would silently let anyone straight
   through. Fixed by triggering a **genuinely fresh build from source**
   (`create_deployment` with `gitSource` + `forceNew: 1`, not a redeploy
   of an existing build ID). Verified after: Ed cleared his phone's
   cached site data, reloaded, saw the PIN screen, entered the PIN,
   worked correctly.

**Current live URL**: `job-vault-six-mu.vercel.app` — confirmed working,
PIN gate + auto-login both verified functioning correctly by Ed on his
actual iPhone.

**Takeaway for next time env vars need to change on Vercel**: use the
Vercel MCP connector's `edit_project_env` directly, then
`create_deployment` with `gitSource` (a real fresh build) — never rely on
"redeploy an existing deployment" when env vars changed, and never ask Ed
to hand-edit multiple Vercel env vars through the mobile site again if it
can be avoided; the mobile form has real usability problems (write-only
secrets, list re-sorting, easy to paste multi-line blocks into one field).

### Clarified: photo-to-form autofill is NOT built yet

Ed asked why photos don't fill in form fields. Confirmed to him this is
expected — Phase 1 photo capture just attaches/categorizes a photo, no
extraction happens. Nameplate OCR autofill is the first Phase 2 item
(still not started) — reuses the free Tesseract.js approach from
`Model-Photo-to-Manual-Lookup`.

### To pick this back up next
- Phase 2, first task: nameplate photo → OCR → editable review screen →
  autofill Equipment form fields (manufacturer/model/serial/etc.), using
  Tesseract.js client-side, no paid API.
- Live app: `job-vault-six-mu.vercel.app` — PIN required, ask Ed.
- Vercel connector and Supabase connector are both connected in this
  Claude session as of today; a fresh session will need Ed to reconnect
  them (or already have them from claude.ai account-level settings —
  unconfirmed whether connector auth persists across sessions).

---

## 2026-09-25 — Phase 2 kickoff: 3 field changes + nameplate OCR scanner

Ed's request bundled three quick DB/UI changes with starting Phase 2.

### Three fixes (all live in the database + app)
1. **Renamed `jobs.customer_complaint` → `jobs.reason_for_call`** — real
   column rename via `supabase/migrations/0004_reason_and_wo.sql`, applied
   live. Updated every reference across the app (types, JobForm, JobDetail,
   JobsList, Dashboard, CustomerDetail, seed.sql).
2. **Added `jobs.work_order_number`** (text, optional) — for the PO/work
   order reference a customer or property manager issues per call. Shown in
   JobForm (Call Details section) and JobDetail header, included in search.
3. **Sites now show address/city/state everywhere they're picked or
   listed** (JobForm's site dropdown, JobDetail header, JobsList, Dashboard
   search, CustomerDetail's site list) — Ed's example was Dollar General:
   many sites per customer, previously indistinguishable by name alone in
   the site picker.

Verified all three end-to-end with a real browser test (local-only mode,
since this sandbox can't reach the live Supabase project): created "Dollar
General" / "Store #12345 — 900 Main St, Springfield, IL" with a work order
number and reason for call, confirmed everything displays correctly on Job
Detail.

### Nameplate OCR scanner (Phase 2, item 1 — done)

New files: `src/lib/nameplateOcr.ts` (regex extraction: manufacturer via a
known-brand keyword list, model/serial via labeled-prefix regex, refrigerant
via known refrigerant codes, voltage/phase/MCA/MOCP via labeled-number
regex) and `src/components/NameplateScanner.tsx` (camera/library photo
capture → grayscale+contrast preprocessing on a canvas → Tesseract.js OCR,
loaded via dynamic `import()` so it doesn't bloat the main bundle → editable
review screen, pre-filled with OCR guesses falling back to the equipment's
existing values for anything not detected → explicit "AI extraction may be
inaccurate" warning → Accept and Save writes the photo as a job_attachment
(category `equipment_nameplate`, with the raw OCR text and structured guess
preserved in `ai_extracted_text`/`ai_extracted_data` for an audit trail) and
updates the equipment record with the (user-reviewed) values).

Wired into Job Detail as a new "Scan Nameplate" section — only enabled once
the job is linked to a piece of equipment (nameplate photos need somewhere
to write the extracted specs); shows a hint to link equipment first
otherwise.

**Testing note**: this sandbox has no network access to the CDN Tesseract.js
fetches its OCR worker script from, so true OCR accuracy could not be
verified here — but that failure path was exercised for real (a photo was
uploaded, the fetch failed exactly as it would on a phone with no signal),
and it degraded exactly as designed: friendly error message, falls back to
manual entry pre-filled with the equipment's existing values, nothing
crashes. **First thing to verify once this is live**: scan a real nameplate
photo on an actual phone with real internet and confirm the OCR read is
reasonably accurate; the regex extraction patterns may need tuning against
real-world nameplate photo text once there's real OCR output to look at.

### To pick this back up next
- Phase 2 remaining: vendor quote/receipt OCR review, voice-to-text notes,
  Parts tracking UI + Quote Builder, AI-generated service summary (the one
  feature that'd want a paid LLM API).
- Nameplate scanner needs a real on-device test with actual internet to
  validate OCR accuracy and tune the regex patterns if needed.

---

## 2026-09-25 (later) — Two-agent review round 2 (functionality + security)

Ed asked for another double-check pass, same pattern as 2026-09-24: one
sub-agent for code/functionality, one for security, both reviewing the
whole codebase (still no separate base branch to diff against), fixing
confirmed issues directly rather than just reporting them.

### Code/functionality review — 3 bugs found and fixed
1. **`src/lib/sync.ts` `pushQueue()` — one failed sync item blocked the
   entire offline queue.** The loop `break`'d on the first error, so a
   single bad or transiently-failing queued mutation (any table) prevented
   every other queued record from ever syncing, since the same failing
   item would be hit first again next pass. Fixed: now skips only that
   record's own later mutations and keeps syncing everything else,
   preserving per-record write order.
2. **`src/lib/sync.ts` `pullAll()` — could silently overwrite unsynced
   local edits.** It unconditionally wrote server data over local
   IndexedDB records, including ones with a pending, not-yet-pushed edit
   queued — an offline edit could revert on screen the moment a pull ran.
   Fixed: now skips writing any record that still has a pending mutation
   queued.
3. **`src/components/NameplateScanner.tsx` — Tesseract OCR worker leaked
   on scan failure.** `worker.terminate()` only ran after a successful
   scan; a failed `recognize()` left the worker (a Web Worker + WASM
   instance) running. Fixed: wrapped in try/finally so it always
   terminates.

### Security review — found and fixed one real access-control bug
**`src/auth/PinGate.tsx` fail-open bug, confirmed still present in code**
(not just the stale-build symptom fixed back on 2026-09-24): if
`VITE_APP_PIN_HASH` is ever missing or empty at build time, the code
itself — by design, not by accident — rendered the full app with no PIN
prompt at all, giving anyone with the URL full access to all customer
data. This is the same failure mode that actually happened once in
production (see 2026-09-24 "Deployed to Vercel," step 7) — that time it
was fixed by forcing a fresh build, but the underlying code path was never
changed, so the same thing could still happen from any future stale or
misconfigured deploy.

Fixed: the missing-hash path now fails **closed** — it shows a "Setup
incomplete" screen instead of the app. Doesn't touch the accepted
no-login/auto-login design at all, just removes a silent full-bypass path
the design was never meant to have.

Both sub-agents independently found and fixed this same bug in parallel
(their edits landed identically) — no conflict, nothing lost.

Everything else checked out clean: no real secrets anywhere in the repo
or git history, `.env.local` still correctly gitignored and never
committed, RLS policies still sound and owner-scoped on every table,
storage policies still correctly scope photo access, no injection risks
in the OCR code, build succeeds with no errors. The one already-known,
already-deferred gap (owner_id not cross-checked on related records like
parts-on-a-job) is still open and still low-urgency for the
single-account reality — unchanged from the 2026-09-24 review.

Commit: `a544347` (sync fixes + OCR leak fix + PinGate fail-closed),
pushed to `claude/notes-md-review-iboqzl`.

### To pick this back up next
- Same Phase 2 remaining items as above.
- The owner_id cross-check gap is still the one open, deliberately-deferred
  hardening item — worth doing before any multi-user future, not urgent now.

---

## 2026-09-25 (even later) — Scope cut: no vendor quote OCR, no Quote Builder

Ed clarified two Phase 2 items that were never actually wanted:

- **Vendor quote/receipt "OCR review"**: not needed. Ed just wants to
  photograph a vendor quote (paper or on his phone) and attach it to the
  job he's on, to reference later — no data extraction required. Checked
  the app: **this already exists**, no new code needed. The general
  `PhotoUploader` component on Job Detail already supports "Choose from
  Library" or "Take Photo," and `vendor_quote` is already one of the
  photo categories (alongside `parts_receipt`, `invoice`, etc.) — so
  picking a library photo, tagging it "Vendor Quote," and saving it
  against the current job is already fully working today. Removed
  "vendor quote/receipt OCR review" from the Phase 2 plan entirely — not
  a build item, just use the existing photo attachment flow.
- **Quote Builder**: not needed. Ed's office handles quoting/pricing, not
  him — he has no use for an in-app quote builder. Removed from the
  Phase 2 plan. The `quotes` / `quote_line_items` DB tables and types
  still exist (unused, harmless) — left as-is rather than migrated out,
  since removing them isn't necessary and a schema change carries more
  risk than value here; can be dropped later if they get in the way, but
  not chasing that now.

**Revised Phase 2 remaining, replacing the earlier list:**
1. Nameplate scanner real-device OCR accuracy test (Ed doing this next).
2. Voice-to-text notes (Web Speech API, free/built-in).
3. Parts tracking UI (parts ordering/status per job) — Quote Builder
   dropped, parts tracking itself still wanted.
4. AI-generated editable service summary (the one feature that'd want a
   paid LLM API) — still optional/last, per original spec.

### To pick this back up next
- Ed is testing the nameplate scanner on his phone next — waiting on that
  before starting anything else in Phase 2.

---

## 2026-09-25 (still later) — Per-field autosave, so switching apps mid-form doesn't lose everything

Ed hit real data loss: filled in a new customer's name, address, and more,
switched apps mid-way, came back, and the whole thing was gone. Root cause:
every form (New Customer, New Site, New Equipment, New Call) only wrote to
the database on the final "Save" button tap — all the typing before that
lived only in React state in memory, so backgrounding/losing the page threw
it all away, not just the one unfinished field.

Fix: added lightweight per-field draft autosave, not a big rewrite —
- New `form_drafts` table in the local IndexedDB (Dexie schema bumped to
  v2, `src/lib/db.ts`) and a small helper (`src/lib/formDraft.ts`:
  `saveDraft`/`loadDraft`/`clearDraft`).
- Each form's outer container now has a single `onBlur` handler (blur
  events bubble in React, so one handler on the wrapping `<div>` covers
  every field in the form — no per-input wiring needed). Leaving any
  field writes the form's *entire* current state to that draft record
  immediately. So the only thing that can still be lost is whatever's in
  the field you're actively typing in at the exact moment the app gets
  killed — everything you already tabbed/clicked away from is saved.
- On opening a form, it checks for a leftover draft and restores it into
  the fields automatically (silently — no dialog, just shows up filled
  in), so resuming an interrupted "New Customer" looks like nothing
  happened.
- The draft is deleted once the record is actually saved for real,
  so it doesn't linger or reappear later.
- Wired into all four data-entry forms: `CustomerForm.tsx`, `SiteForm.tsx`,
  `EquipmentForm.tsx`, `JobForm.tsx` (the "New Call" flow — this is the one
  Ed actually lost data in, since it's where customer/site get created
  inline).

Verified: `tsc -b` and `vite build` both succeed cleanly with no errors
(installed `node_modules` temporarily to run the real build in this
sandbox, removed both `dist/` and `node_modules/` afterward — nothing
extra committed). Not yet tested in-browser for the actual
blur-triggers-save-and-restore behavior — first thing to check on a real
device: type into a few fields of a New Call, switch apps (don't hit
Save), come back, confirm everything except the very last field you were
mid-typing is still there.

### To pick this back up next
- Ed to verify the autosave behavior on his phone (switch apps mid-form,
  confirm it restores), alongside the still-pending nameplate OCR
  accuracy test.

---

## 2026-09-25 (latest) — Real bug found (deploy gap, not code), plus 5 requested changes

Ed tested on his phone and reported the autosave "wasn't working" plus a
batch of other requested changes.

### The autosave bug — root cause was never a code bug, it was a deploy gap

Reproduced the exact scenario in a real headless browser (Playwright):
typed a customer name, blurred the field, then reloaded the page cold (the
equivalent of the app being killed and reopened) — **the draft saved and
restored correctly, every time.** So the mechanism itself works.

Checked the Vercel project directly (`get_project` via the Vercel MCP
connector) and found the real problem: the live URL Ed tests on
(`job-vault-six-mu.vercel.app`) is still serving the `claude/service-log
-hvac-app-ssx82g` branch's old build. **Every fix from this whole session
— today's bug fixes, security fixes, the autosave feature, all of it —
has only ever existed on this session's own branch
(`claude/notes-md-review-iboqzl`) and has never been deployed.** Ed has
been testing genuinely old code the entire time. Flagging this to Ed
directly rather than deploying it myself, since pushing to a different
branch / changing what's live needs his say-so first (see Quick Facts —
default/production branch is currently `claude/service-log-hvac-app-ssx82g`).

**Testing method note for future sessions**: this sandbox can reach
neither Supabase nor the live Vercel deploy, but the local Vite dev
server works fine for testing UI/logic changes that don't need a real
network call — ran it locally with a temporary, gitignored `.env.local`
containing only a throwaway test PIN hash (no Supabase vars at all, which
makes the app run in its already-supported "local-only" mode) to get past
the PIN gate and exercise real form behavior in a real Chromium browser,
including inspecting IndexedDB directly. Deleted that temp `.env.local`
before finishing — never committed, never real credentials.

### Five requested changes, all made

1. **Customer name styled like a heading** — the Customer Name field on
   the New/Edit Customer form is now large, bold text instead of a normal
   small input (`CustomerForm.tsx`).
2. **Removed phone, email, and the "Business type" dropdown from Customer**
   — Ed only does commercial work, so `customer_type` is now hardcoded to
   `'commercial'` behind the scenes everywhere a customer gets created
   (`CustomerForm.tsx` and JobForm's inline "+ New customer" mini-form) —
   no dropdown shown anywhere anymore. Phone/email fields removed from
   both forms entirely. The DB columns for `phone`/`email`/`customer_type`
   still exist (harmless, unused) — didn't do a schema migration to drop
   them, lower risk to just stop collecting/showing them in the UI.
   `CustomerDetail.tsx` and `CustomersList.tsx` no longer display type,
   phone, or email.
3. **"Billing address" renamed to "Address"** — same field
   (`billing_address` column unchanged), just relabeled; it was already
   shown without the word "billing" on the customer detail screen, so no
   change needed there.
4. **Case-insensitive search** — already true everywhere there was an
   actual search box (`CustomersList`, `Dashboard`, `JobsList` all already
   lowercase both sides before comparing) — verified, no change needed
   there. The actual gap was narrower: the Customer picker on the New Call
   screen wasn't a search box at all, it was a plain dropdown list.
5. **Live-narrowing customer search on the New Call screen** — replaced
   that dropdown with a type-ahead text field: typing shows every customer
   whose name contains what's typed (case-insensitive, partial match),
   narrowing as you type more, down to the one exact match once the full
   name is typed; tapping a suggestion selects it. Verified in a real
   browser test: typing "DOLLAR" matched both "Dollar General" and
   "dollar tree," typing the full "Dollar General" narrowed to just that
   one.

`tsc -b` and `vite build` both pass clean. Not yet tested on Ed's phone —
can't be, until the branch with these changes is actually deployed.

### To pick this back up next
- **Needs Ed's decision**: how to get this branch's commits onto the live
  Vercel URL — merge into `claude/service-log-hvac-app-ssx82g` and deploy,
  point Vercel's production branch at this branch, or something else. Until
  that happens, testing on the phone will keep showing old behavior no
  matter what gets fixed here.
- Once deployed: re-verify the autosave behavior for real, plus the
  nameplate OCR accuracy test that's already been waiting.

---

## 2026-09-25 (deploy) — Deployed everything to production, resolved

Ed picked the "merge into production branch" option. Since this session's
branch (`claude/notes-md-review-iboqzl`) was a clean, fast-forward-only
descendant of `claude/service-log-hvac-app-ssx82g` (no conflicts
possible — verified with `git merge-base --is-ancestor` first), pushed it
straight across (`git push origin claude/notes-md-review-iboqzl:
claude/service-log-hvac-app-ssx82g`). That push auto-triggered a real fresh
Vercel build (confirmed via the Vercel MCP connector: new deployment,
target `production`, state `READY`, built from the new commit) and
`job-vault-six-mu.vercel.app` now aliases to it. Confirmed via
`get_deployment` that the live alias serves the new commit. Everything
from tonight — sync fixes, PinGate fail-closed, draft autosave, the
Customer field changes, the customer search — is now actually live, not
just committed.

## 2026-09-25 (still later) — Nameplate scanner location explained; added a second OCR scanner for dispatch tickets

### Why the nameplate scanner seemed missing
Ed couldn't find anywhere to scan a photo. It does exist (`JobDetail.tsx`,
"Scan Nameplate" section) but only shows Take Photo/Choose from Library
buttons once the call has **equipment linked** — if not, it just shows one
quiet gray hint sentence and nothing else, which reads as "not there."
Explained where it lives and how to link equipment first. Left as-is for
now (Ed didn't ask for a change here, just an explanation) — a follow-up
idea logged below for making that hint screen actionable instead of a
dead end.

### New: scan a dispatch ticket/work order photo to create a Customer + Site

Ed's actual office workflow: dispatch sends a photo/screenshot of a work
order card (ticket #, "Customer Name | Store #", address, task
description, work order #) and he currently retypes all of that by hand
into New Customer + New Site. Wanted the same "photo → OCR → editable
review → save" pattern already used for nameplates, applied to this.

Built as a new, separate scanner (not reusing the nameplate one — the
label shapes are completely different) —
- **`src/lib/dispatchOcr.ts`**: regex extraction for customer name +
  site/store number (from a `Name | Number` line), street address + city/
  state/zip (paired by adjacent lines, matched on a `City, ST 12345`
  pattern), a work order number (prefers a dash-suffixed reference like
  `1894132-01`, falls back to a plain numeric ticket ID), the task/reason
  line (`Tasks: ...`), and a best-effort contact name. Verified against
  the exact sample ticket Ed shared (a Liquor Barn work order) — every
  field extracted correctly, both as clean text and with OCR-noise-like
  variations (case drift, extra spacing).
- **`src/screens/DispatchScan.tsx`** (`/customers/scan`): same house
  pattern as the nameplate scanner — Take Photo/Choose from Library →
  Tesseract OCR (dynamic import, doesn't bloat the bundle) → editable
  review screen with the same "AI extraction may be inaccurate, review
  every field" warning → Create Customer (+ Site, if address info was
  found). Customer name field styled as a heading, matching the New
  Customer form's look.
- **Two entry points**: a "Scan Ticket" link next to "+ New" on the
  Customers list (creates the customer/site and drops onto that new
  record), and a "Scan a ticket instead" link next to "+ New customer" on
  the **New Call** screen (`?returnTo=job` — after creating the
  customer/site it navigates straight into New Call with the customer,
  site, work order #, and reason-for-call all pre-filled via router
  state, so a dispatch photo can go straight to a ready-to-save call).

**Testing**: this sandbox can't reach the Tesseract.js CDN (same
already-documented limitation as the nameplate scanner), so true OCR
couldn't be run end-to-end here — but verified everything around it for
real: the extraction function itself (via the actual bundled module, not
a copy) against the real sample ticket text; the screen renders and
routes correctly; and uploading a real photo in a real browser exercises
the OCR-failure path exactly as it would with no signal, degrading
cleanly to the same manual-entry review screen rather than breaking.
`tsc -b` and `vite build` both pass clean.

### To pick this back up next
- **First real test needed**: Ed to scan an actual dispatch ticket photo
  on his phone (real internet, real Tesseract) and confirm both OCR
  scanners' accuracy — nameplate and dispatch — tuning the regex patterns
  in `nameplateOcr.ts`/`dispatchOcr.ts` against real output if needed.
- Possible follow-up (not yet requested): make the nameplate scanner's
  "link equipment first" hint on Job Detail tappable — jump straight into
  adding/linking equipment instead of being a dead end.
- This work is on `claude/notes-md-review-iboqzl` only — needs the same
  "merge into production and deploy" step as above before Ed can test it
  live (Ed already knows this deploy step now, from the previous entry).

**Update**: deployed the same way (fast-forward into
`claude/service-log-hvac-app-ssx82g`, confirmed via the Vercel MCP
connector that `job-vault-six-mu.vercel.app` rebuilt fresh and now
aliases to it). Live as of this entry.

---

## 2026-09-25 (yet later) — PO#/Dispatch# split, second real ticket layout, site naming fix

Ed sent a second real dispatch ticket (a different card layout than the
first — this one has the PO#/Dispatch# explicitly labeled, "Issues:"
instead of "Tasks:", and a "City, ST - County" address line with no zip)
and asked for three changes based on testing the scanner against it.

1. **Split "Work order #" into PO # and Dispatch #** — the ticket shows
   both as genuinely separate numbers (`PO#: 1894132-01` and
   `Dispatch#: 153264`), so one field was never going to hold both.
   Added a real `jobs.dispatch_number` column
   (`supabase/migrations/0005_dispatch_number.sql`, applied live via the
   Supabase MCP connector, search index updated to include it) alongside
   the existing `work_order_number`, now labeled "PO #" everywhere it's
   shown to Ed (New Call form, Job Detail header badge — was "WO#", now
   "PO#") rather than renaming the column itself. New Call now has both
   "PO #" and "Dispatch #" fields side by side. Both added to the
   Dashboard/JobsList search haystack too, same as the existing PO# was.
2. **Dispatch scanner: PO #/Dispatch #/Reason for call only shown when
   continuing to a call** — on the plain "Scan Ticket" entry (Customers
   list, no call being created), those three fields are hidden entirely
   now, since there's nowhere for them to be saved when only a
   Customer/Site is being created. They only appear on the
   `?returnTo=job` entry point (from New Call's "Scan a ticket instead"),
   where they get carried forward into the pre-filled call. Verified both
   modes in a real browser test with the actual second ticket photo.
3. **Site name no longer just a bare store number** — when the ticket's
   "Name | Number" line has only a number after the pipe (no distinct
   site brand name), the created site is now named `"<Customer Name>
   #<Number>"` (e.g. "Liquor Barn #948") instead of a generic "Store
   #948" with no name in it at all. Ed's example: some accounts have a
   different site brand than the customer name (Discount Tire the
   customer, Mavis Tire the site) — when a ticket actually shows a
   distinct site name after the pipe, that's still used as-is unchanged;
   this fix only affects the bare-number case.

### `dispatchOcr.ts` rewritten to handle both real ticket layouts seen so far
- City/state/zip regex no longer requires a zip (this ticket's address
  line has none: "Owensboro, KY - Daviess Cnty").
- Street address is found by scanning up to 3 lines back from the city
  line instead of only the immediately preceding line — this ticket has a
  "TRAVEL TO" route/date badge line sitting between the street address
  and the city line, which the old one-line-back logic would've missed.
- Reason for call now matches both "Tasks:" and "Issues:" labels.
- PO#/Dispatch# extraction now prefers an explicit label ("PO#:",
  "Dispatch#:") when present, falling back to the old unlabeled heuristics
  (dash-suffixed number / standalone numeric line) for tickets without
  labels — covers both ticket styles Ed has sent so far.
- Verified against both real tickets, plus a synthetic variant simulating
  OCR splitting a two-column row (PO#/price, Dispatch#/Zone) onto separate
  lines, since real Tesseract output order for side-by-side text isn't
  fully predictable — all extracted correctly.

`tsc -b` and `vite build` both pass clean.

### To pick this back up next
- **Not yet deployed** — this batch (PO#/Dispatch# split + the dispatch
  scanner fixes) is committed on `claude/notes-md-review-iboqzl` only;
  needs the same fast-forward-to-production step as the last two batches
  before Ed can test it live.
- Still waiting on Ed's first real on-device OCR test (real internet,
  real Tesseract) for both scanners — everything verified so far has been
  extraction-logic and UI-wiring checks in this sandbox, never real OCR
  output.

---

## 2026-09-25 (yet again later) — Delete a call, delete a customer (cascading)

Ed wanted three things, which turned out to be two features: a way to
delete a single call made by mistake or since cancelled, and a way to
delete a customer — either an accidental entry, or a real former customer
with everything under it (his example: Liquor Barn with 20-30 sites and a
long job history, if they stop being a customer).

### Why this needed real thought, not just a delete button
Checked `supabase/migrations/0001_init.sql` first: `jobs.customer_id` and
`jobs.site_id` are `on delete restrict` — Postgres will outright refuse to
delete a customer or site while any job still references it. Sites and
equipment, on the other hand, *do* cascade (`on delete cascade` from
customers/sites), as do everything hanging off a job (activity, photos,
parts, quotes + line items, vendor docs, readings, follow-ups — all
`on delete cascade` from jobs). So the only safe order is: delete every
job under the customer first (each one for real, enqueued to Supabase),
*then* delete the customer, which then cascades sites + equipment
automatically server-side.

IndexedDB has no real foreign keys, so none of that cascading happens
locally — local copies of everything need deleting directly, or they'd
sit around forever (defeating the actual point Ed raised: freeing up
space for a customer that's gone). Also handled a subtler edge: a
still-queued, not-yet-synced mutation for a child record that's about to
be deleted (e.g. a photo mid-upload) would otherwise keep retrying
forever against a parent that no longer exists once the cascade lands —
those get purged from the local sync queue too.

### What was built (`src/lib/repo.ts`)
- `deleteJobCascade(jobId)` — deletes a job and everything under it
  (activity, photos + their local blob cache, parts, quotes + line items,
  vendor docs, readings, follow-ups), all locally; only the job itself
  gets a real remote delete enqueued (the rest cascade server-side once
  it lands).
- `deleteCustomerCascade(customerId)` — runs `deleteJobCascade` for every
  job under the customer, then deletes every site + its equipment
  locally, then enqueues one real remote delete for the customer itself
  (which cascades the sites/equipment removal server-side). Only the jobs
  and the customer get individual remote deletes — not 20-30 redundant
  ones for a big account's sites/equipment.

### UI
- **Job Detail**: a red "Delete Call" button at the bottom, `confirm()`
  naming the job number and what it'll take with it, then back to the
  Jobs list.
- **Customer Detail**: a red "Delete Customer" button, `confirm()` stating
  the *actual* counts (sites/equipment/calls) about to be deleted, so it's
  not a blind confirmation, then back to the Customers list.
- Deliberately just one delete action per screen, not a separate "did I
  make a mistake" vs. "this customer is gone for good" flow — those are
  the same action at different times, per Ed's own framing.

**Known limitation, not solved here**: photo/attachment files already
uploaded to Supabase Storage aren't deleted by this — only the database
rows are. Deleting a customer with real photo history will leave those
files behind in Storage (still counts toward the destructive DB cleanup
Ed wanted, just doesn't reclaim Storage space). Worth a follow-up if that
becomes a real cost/space concern.

**Testing**: this is destructive and irreversible, so verified it for
real rather than just reading the code — seeded a full customer tree
(2 sites, 2 pieces of equipment, 2 jobs, and one of every child record
type including a deliberately-stale queued mutation) directly into
IndexedDB in a real browser, ran `deleteCustomerCascade` through the
actual bundled module, and confirmed: every table ended at 0 rows, the
sync queue held exactly 3 entries (job, job, customer — delete ops, in
that exact order) and nothing else, and the stale queued mutation for a
deleted part was gone. Also confirmed both confirm() dialogs show the
right counts/wording and that Cancel leaves everything untouched.
`tsc -b` and `vite build` both pass clean.

### To pick this back up next
- **Not yet deployed** — same as the last two batches, sitting on
  `claude/notes-md-review-iboqzl` only.

---

## 2026-09-25 (final for now) — Second-opinion review from Gemini, one real fix taken

Ed sent the full source to Gemini for an independent review and pasted its
findings back here. Went through each one against the actual code rather
than taking either AI's word for it:

1. **"Dashboard.tsx is truncated, won't build"** — false. Re-ran
   `tsc -b && vite build`, passes clean, file is complete. Almost
   certainly Gemini's own input got cut off (a context/length limit on the
   prompt side, not a real bug) and it mistook that for a broken file.
2. **"Auth/PIN gate is a security vulnerability, use real Supabase Auth
   instead"** — the observation (client env vars land in the public JS
   bundle) is true and already known/documented; the suggested fix isn't
   a fix — the app already uses `supabase.auth.signInWithPassword`, and
   *some* credential has to live client-side for zero-friction auto-login
   to work at all, which is the point Ed explicitly wanted (no login
   screen, can't get locked out). Left as-is, both AIs agreed.
3. **"Cascade delete / sync queue race condition"** — not borne out by the
   code: `pushQueue` only removes a queue entry after its Supabase call
   succeeds (inside the `try`, after the `await`), and `deleteCustomerCascade`
   was already stress-tested end-to-end a few messages earlier this
   session. Left as-is.
4. **"Memory leaks in PhotoUploader and NameplateScanner"** — split
   verdict:
   - `PhotoUploader.tsx`: real, fixed. `URL.createObjectURL(pendingFile)`
     was called inline in JSX, creating a fresh blob URL on every
     re-render with the old one never revoked. Moved it into a `useEffect`
     keyed on `pendingFile` that revokes the previous URL before creating
     the next one (and on unmount). Verified in a real browser: preview
     still renders correctly from a real photo, and disappears cleanly on
     Cancel.
   - `NameplateScanner.tsx`: suggestion (a single persistent, reused
     Tesseract worker) rejected by both AIs — the scanner is used
     sparingly per job, and a persistent worker would keep several MB of
     WASM resident in memory permanently instead of only during an active
     scan, which is worse on a phone, not better. The real bug here
     (worker not terminated on OCR failure) was already fixed earlier
     this session.

`tsc -b` and `vite build` both pass clean after the one fix.

### To pick this back up next
- This fix, plus everything from the batch before it, is still only on
  `claude/notes-md-review-iboqzl` — not yet deployed.

**Update**: deployed (fast-forward into `claude/service-log-hvac-app-ssx82g`,
confirmed via the Vercel MCP connector that `job-vault-six-mu.vercel.app`
rebuilt fresh and now aliases to it). Live as of this entry — this closes
out everything from today's session (dispatch scanner, PO#/Dispatch#
split, delete call/customer, the PhotoUploader fix).

### Still open, whenever picked back up next
- **First real on-device test still needed** for both OCR scanners
  (nameplate + dispatch ticket) — everything verified in this sandbox has
  been extraction-logic and UI-wiring checks, never real Tesseract output
  on a real photo with real internet.
- Known low-urgency gap, unchanged from earlier reviews: no cross-check
  that a related record's owner matches the parent's owner (e.g. a part
  on a job) — fine for the current single-owner reality, worth hardening
  before any multi-user future.
- Known limitation from the delete feature: deleting a customer/call
  doesn't remove already-uploaded photo files from Supabase Storage, only
  the database rows — a follow-up if Storage space ever becomes a real
  concern.

---

## 2026-09-26 — Dispatch scanner: site name bug (first real on-device test)

Ed's first real on-device OCR test (the "Scan Ticket" flow from the
Customers list, on the same Liquor Barn ticket used earlier). Real
Tesseract output on the "Name | Number" line came back with a stray
character or two after the store number (`948 Xx` instead of `948`),
which failed the old strict `/^\d+$/` bare-number check in
`extractDispatchFields` (`src/lib/dispatchOcr.ts`) and left the site
literally named "948 Xx" instead of "Liquor Barn #948". Fixed: that check
now tolerates a short trailing noise token after the number. Verified
against the real OCR text from this test — now produces
`siteName: "Liquor Barn #948"` correctly.

Also confirmed with Ed: the missing PO#/Dispatch#/Reason-for-call fields
on that screen are expected, not a bug — those only show up when the
scanner is reached via "New Call → Scan a ticket instead," by design (see
2026-09-25 "yet later" entry). No change made there.

`tsc -b` and `vite build` pass clean.

### To pick this back up next
- Not yet deployed — this fix is committed on
  `claude/review-notes-app-build-bkvmc1` only.
- Still waiting on a real on-device test of the nameplate scanner, and a
  test of the dispatch scanner's `?returnTo=job` path (New Call → Scan a
  ticket instead), which hasn't been exercised with real OCR yet.

---

## 2026-09-26 (later) — "Importing a module script failed" after deploy

Right after the site-name fix above went live, Ed hit a scanner error:
"Importing a module script failed." Root cause: he had the app open in his
browser/PWA from *before* that deploy finished. Both scanners load
Tesseract via a dynamic `import('tesseract.js')` so it doesn't bloat the
main bundle — but that means the already-loaded page (running the old
build's JS) was still pointing at the old build's hashed chunk filename
for that import. Vercel's new deployment doesn't keep the old build's
static files around, so that filename 404'd the moment he tried to scan
after the swap. Not an OCR bug, not a code bug in the extraction logic —
a normal side effect of code-splitting + replacing the whole production
build, that was always going to happen on some deploy sooner or later to
whoever already had a tab open.

Fixed generally, not just patched for this one instance: new
`src/lib/staleChunk.ts` recognizes that specific error message
class (`isStaleChunkError`), and both `NameplateScanner.tsx` and
`DispatchScan.tsx` now check for it in their OCR catch block — instead of
showing the scary raw error, it shows "Update found — reloading…" and
does a real `window.location.reload()`, which pulls the current build
fresh and fixes it in one tap. This will keep happening on some
percentage of future deploys (anyone with the tab open across a
production swap) — the fix isn't "stop it happening," it's "recover from
it automatically instead of showing a dead-end error."

`tsc -b` and `vite build` pass clean.

### To pick this back up next
- Not yet deployed — sitting on `claude/review-notes-app-build-bkvmc1`
  only, needs the same push-to-production step as usual.
- Ed should also just close/reopen the app once after any deploy, same as
  before — this fix just means a scan-in-progress recovers on its own
  instead of dead-ending, not that reopening is no longer ever needed.

---

## 2026-09-26 (later still) — Nameplate scan on New Equipment; cascading equipment subtype

Ed asked for two things after adding equipment for the first time:

1. **No way to scan a nameplate straight from New Equipment.** The
   existing nameplate scanner (`NameplateScanner.tsx`) only lives on Job
   Detail and needs both a job and an equipment record already linked —
   no help when you're creating the Equipment record itself. Added a
   lighter scan button directly on the New/Edit Equipment form.
2. **Category alone doesn't capture enough** — e.g. picking "Split
   System" should then ask which physical unit this record is (outdoor or
   indoor — each has its own nameplate) and then a further type choice
   (Heat Pump Condenser vs. AC Condenser for outdoor; Furnace vs. Air
   Handler for indoor); "Package Unit" should ask gas/electric vs. heat
   pump vs. straight cool, etc. Researched realistic type choices for
   every equipment category relevant to Ed's actual commercial HVAC/
   refrigeration work and built them into cascading dropdowns.

### What was built
- **DB**: `supabase/migrations/0006_equipment_subtype.sql` — added
  `equipment.unit_position` (`outdoor`/`indoor`, split systems only) and
  `equipment.subtype` (free text, not an enum — so "Other" can hold
  anything without needing a migration every time a new type comes up),
  applied live via the Supabase MCP connector. Search index updated to
  include `subtype`.
- **`src/types/index.ts`**: `SPLIT_SYSTEM_SUBTYPES` (separate outdoor/
  indoor lists) and `EQUIPMENT_SUBTYPE_OPTIONS` (per-category lists for
  every other category that has real sub-choices — package unit/RTU, heat
  pump, furnace, air handler, walk-in cooler/freezer, reach-in, ice
  machine, exhaust fan, make-up air unit, mini-split, boiler, water
  heater; `other` intentionally has none).
- **`src/components/EquipmentTypeFields.tsx`** (new, shared): renders
  whatever follow-up choice(s) a category needs — the Outdoor/Indoor
  split for split systems, then a Type select scoped to that choice; a
  plain Type select for every other category with a preset list; nothing
  for categories without one. Every Type select ends with "Other (type
  below)", which reveals a free-text field — used instead of a rigid enum
  so nothing Ed runs into in the field is ever a dead end.
  Wired into both `EquipmentForm.tsx` (the full New/Edit Equipment
  screen) and JobForm's inline "+ New equipment" quick-add (New Call
  flow), so the same cascade applies wherever equipment gets classified.
- **`src/components/NameplateScanButton.tsx`** (new): Take Photo/Choose
  from Library → OCR → fills whichever manufacturer/model/serial/
  refrigerant/voltage/phase/MCA/MOCP fields it found, directly into the
  form already on screen (no separate review screen needed — the form
  fields ARE the review). No job/photo attachment involved, unlike the
  existing Job Detail nameplate scanner, since there's no job yet at this
  point. Wired into `EquipmentForm.tsx` above the Identity section.
- **`src/lib/ocr.ts`** (new): pulled the shared OCR pipeline
  (load image → contrast/grayscale canvas preprocessing → Tesseract via
  dynamic import) out of `NameplateScanner.tsx` and `DispatchScan.tsx`,
  which had it duplicated almost verbatim, into one place — now used by
  those two plus the new `NameplateScanButton`.

Also surfaced the new unit/subtype detail wherever equipment already
shows up (`EquipmentDetail.tsx` header line, `SiteDetail.tsx`'s equipment
list) so it's not invisible once saved.

### Testing
Ran a real local browser test (Playwright, local-only mode — same
approach as previous sessions, temporary throwaway PIN, nothing
committed): confirmed the Scan Nameplate button renders on New Equipment;
confirmed the cascade end-to-end — default category (Split System) shows
a Unit select, choosing Outdoor Unit reveals a Type select scoped to
outdoor options, choosing "Other" reveals the free-text field, and
switching category to Package Unit swaps straight to its own Type list
with no Unit step. `tsc -b` and `vite build` both pass clean.

**Not yet tested**: real on-device OCR scan from the New Equipment
screen (same CDN/network limitation as always in this sandbox) — should
behave the same as the already-verified Job Detail nameplate scanner
since it reuses the same OCR pipeline, but worth a first real check.

### To pick this back up next
- Not yet deployed — sitting on `claude/review-notes-app-build-bkvmc1`.
- First real on-device test of the New Equipment nameplate scan button.
- Ed should try a few real category choices (a walk-in cooler, an RTU,
  etc.) and say if any of the researched subtype lists are missing an
  option he actually needs, or have wording he'd phrase differently —
  these are free-text-escapable ("Other") but worth tightening if a
  whole category of gear is missing a common real-world type.

**Update**: deployed (fast-forward into `claude/service-log-hvac-app-ssx82g`,
confirmed via the Vercel MCP connector that `job-vault-six-mu.vercel.app`
rebuilt fresh and now aliases to it). Live as of this entry.

---

## 2026-09-26 (later again) — First real nameplate scan: "did not upload any information"

Ed's first real on-device test — a Heatcraft refrigeration condensing
unit nameplate (a photo of the actual plate, shared in chat) — came back
with nothing filled in. Investigated by transcribing the real nameplate's
text by hand (this sandbox still can't reach the Tesseract CDN to run
real OCR, so worked from the actual label content) and running it through
`extractNameplateFields`. Found three real, distinct problems, not one:

1. **The regex logic only understood one nameplate layout.** All the
   previous testing/tuning was against split-system/RTU-style nameplates
   that print labels and values inline ("MCA 21.5", "230V", "1PH"). This
   Heatcraft plate — a commercial refrigeration condensing unit — spells
   every label out in full and lays it out as a table (a header row like
   "VOLTS PHASE HERTZ" with the actual numbers in a separate row below).
   None of `voltage`/`phase`/`mca`/`mocp`'s old patterns could ever match
   that shape, regardless of how clean the OCR read was. Added a
   table-aware fallback for voltage/phase (finds the "VOLTS PHASE HERTZ"
   header, then reads the next number/number/number row after it) and a
   fallback for refrigerant type (this plate's refrigerant codes,
   "404A/507" and "22", have no "R-" prefix at all — added a bare-code
   match scoped near the word "REFRIGERANT" so it can't misfire on an
   unrelated number elsewhere on the plate).
2. **Deliberately did NOT add an equivalent fallback for MCA/MOCP.**
   Tried one (search forward from the spelled-out label for the first
   number), but this plate's 3-column table layout means a different
   column's data can legitimately land right after another column's
   label in OCR's reading order — confirmed this by testing: it returned
   "200" (the voltage) as both MCA and MOCP, silently wrong. Since MCA/
   MOCP set wire and breaker sizing, a confidently-wrong number here is a
   real safety hazard, worse than leaving it blank — reverted to only
   trusting the abbreviated inline form for these two, same as before.
   Ed will still need to read those two off the plate by hand on
   nameplates that spell them out in full; the app now says so explicitly
   instead of silently returning nothing with no explanation.
3. **A real bug, found only by testing the actual serial number against
   the actual next line of text on this plate**: the voltage regex had no
   word-boundary check, so `...T16J11397 VOLTS PHASE HERTZ...` matched
   "397" (the tail of the serial number) as if it were a voltage, because
   "397" sits directly before "VOLTS" once OCR's line breaks collapse to
   spaces. Fixed by requiring a proper token boundary before the digits.
4. **No visibility into what happened.** `NameplateScanButton.tsx` (the
   new New Equipment scan button) had no "show raw scanned text" toggle
   unlike the older scanners, and no explicit message when zero fields
   were found — so "it scanned but found nothing" and "it silently
   failed" looked identical to Ed. Added a raw-text toggle, a
   "filled in N of 8 fields" status message, and an explicit message
   when nothing was found, with a nudge to check the raw text.
5. **Hardening, not directly implicated here but a latent risk from the
   stale-chunk-reload fix earlier today**: `isStaleChunkError` was being
   checked against the *entire* OCR pipeline's errors, including failures
   from inside Tesseract's own loading/recognition — which could
   plausibly throw similar-sounding "failed to fetch" wording for a
   genuine, unrelated problem (its own CDN load failing, a real OCR
   error). That would have silently reloaded the page over a real failure
   instead of showing it. Narrowed: `runOcr()` (`src/lib/ocr.ts`) now only
   raises a distinct `StaleChunkImportError` for a failure of the app's
   *own* `import('tesseract.js')` call specifically; everything past that
   point falls through to the normal "could not read the photo" message.
   Not confirmed as the actual cause here (items 1–3 above are sufficient
   explanation on their own), but a real latent bug worth closing either
   way.

Verified all of the above by hand-transcribing this exact real nameplate's
text and running it through the updated extraction function directly
(node, not a real OCR pass) — now correctly pulls manufacturer, model #,
serial #, refrigerant type, voltage, and phase from it; MCA/MOCP correctly
stay blank with the new messaging explaining why, rather than a silently
empty scan. Also re-ran a simple inline-style nameplate through it to
confirm the fallbacks didn't regress the common case — still gets all 8
fields. `tsc -b` and `vite build` both pass clean.

### To pick this back up next
- Not yet deployed — sitting on `claude/review-notes-app-build-bkvmc1`.
- Still no way to verify real Tesseract OCR quality from this sandbox —
  everything above was verified against hand-transcribed "what the OCR
  should read if it reads the plate cleanly" text, not an actual OCR
  pass. Ed's next real scan (same plate or a different one) is the real
  test — if the label's real OCR output looks meaningfully different from
  a clean transcription (mis-read characters, garbled words), the regexes
  may need another round of tuning against the real raw text, which is
  now visible via the new "Show raw scanned text" toggle if it comes to
  that.
- MCA/MOCP will stay manual-entry-only on nameplates that spell the label
  out in full rather than abbreviate it (a deliberate, safety-motivated
  choice, not an oversight) — worth revisiting only if a genuinely
  reliable way to disambiguate table columns from OCR text turns up.

---

## 2026-09-26 (yet again) — Same Heatcraft plate, real scan this time: zero fields found

Ed scanned the exact same Heatcraft condensing unit nameplate from the
entry above for real (New Equipment, under an existing customer, photo
picked from his library) — and got nothing at all, not even a partial
read. This is the first real Tesseract pass on this plate; everything in
the entry above was verified only by hand-transcribing "clean" text and
running it through the regex directly, never real OCR output, so it
couldn't have caught this.

Ed sent the actual photo. Looked at it directly: it's a full nameplate
occupying maybe a third of a much larger, heavily textured gray metal
panel — visible cracks/crazing across the whole panel surface, peeling
sticker edges, other stickers and a QR code nearby. The label itself is
also a 3-column table layout (VOLTS/PHASE/HERTZ | MIN. CIRC. AMPACITY |
MAX. OVERCURRENT...) sitting side by side in one row, not stacked — a
harder shape for Tesseract's default automatic page-segmentation mode
(it tries to lay out the *entire* photo as a page, and a large expanse of
cracked/textured metal can easily get mistaken for text-like blocks, or
scramble which column's numbers land next to which label in the reading
order). Couldn't verify the actual raw OCR output directly (still no
CDN access from this sandbox, and this session's build never got a
chance to prompt Ed for the raw-text toggle before he sent the photo
instead), so this is a real, well-documented failure mode being applied
here, not a confirmed root cause — flagged as such below.

**Fix applied**: `runOcr()` (`src/lib/ocr.ts`) now takes a `mode`
parameter — `'label'` sets Tesseract's page-segmentation mode to
`PSM.SPARSE_TEXT`, which looks for text of any size scattered anywhere in
the image instead of trying to lay the whole photo out as a structured
page. Both nameplate scanners (`NameplateScanButton.tsx`,
`NameplateScanner.tsx`) now pass `'label'`, since both photograph a small
printed/etched label against a large, usually-cluttered equipment
surface. The dispatch ticket scanner (`DispatchScan.tsx`) is left on the
default (`'document'`, plain automatic mode) since it photographs a card
that's mostly text edge-to-edge, a genuinely different shape where the
existing default already works.

**Verified**: `tsc -b` and `vite build` both pass clean; confirmed
`tesseract.js@7`'s actual installed module exports `PSM.SPARSE_TEXT`
(checked directly via `node -e "require('tesseract.js').PSM"`, not just
assumed from memory/types). **Not verified**: whether this actually fixes
this specific plate's real-world OCR read — still no way to run real
Tesseract against a real photo from this sandbox. This is a legitimate,
standard fix for "small label photographed against a large busy
background" (sparse-text mode exists in Tesseract specifically for this),
but it's not a confirmed diagnosis of this exact failure — the manufacturer
name on this plate's title is also visibly cracked/broken in the photo, which
could independently keep "HEATCRAFT" from being read at all regardless of
segmentation mode.

### To pick this back up next
- **Real test needed**: Ed to re-scan this same nameplate photo (or a
  fresh one) after this fix ships, and check "Show raw scanned text" this
  time if it still doesn't fill fields — that raw text is the one thing
  that would let a future session actually see what Tesseract produced
  instead of guessing at fixes blind. If it's still garbled, the next
  step is tuning `nameplateOcr.ts`'s patterns against that real raw text,
  not another blind segmentation-mode guess.
- Everything else from the entry above (the hierarchical Systems/
  Components schema, still in progress as of this entry) is unrelated to
  this fix and tracked separately.
## 2026-09-26 (later still) — Hierarchical Systems/Components schema, replacing flat Equipment

Ed (via a spec already reviewed and approved) asked for the flat `equipment`
model to become a real Parent System -> Component(s) hierarchy: a System is
the top-level unit at a site ("Walk-in Cooler," "Split System #4," "Packaged
RTU #2"), a Component is a physical part with its own nameplate
("Condensing Unit #1," "Evaporator Coil," "Furnace," "VAV Box #3"), and one
System has many Components.

### Taxonomy
Built as the dynamic dropdown source, same spirit as the existing
`SPLIT_SYSTEM_SUBTYPES`/`EQUIPMENT_SUBTYPE_OPTIONS` pattern but restructured
for System Type -> allowed Component Types (`src/types/index.ts`):
- **Commercial Refrigeration** — Walk-in Cooler/Freezer, Reach-in
  Cooler/Freezer; components: Condensing Unit, Evaporator/Unit Cooler,
  Self-Contained Package.
- **Split Systems** — one System Type ("Split System"), plus a System
  Configuration field (Single-stage/Multi-stage/Dual-Fuel/Twinned); indoor
  components (Gas Furnace, Electric/Hydronic Air Handler, Water-Source Heat
  Pump, Evaporator Coil) and outdoor components (AC/Heat Pump Condenser)
  are genuinely different lists, so adding a component asks Position first.
- **Packaged Units/RTUs** — Packaged RTU/Gas-Electric/Heat Pump/Dual-Fuel;
  components: VAV Box, CAV Box, Bypass Damper (no position split).
- **Ductless/VRF** — Mini-Split, VRF/VRV System; outdoor (VRF Heat Recovery
  Condenser, Heat Pump Condenser) vs. indoor (Wall Mount, Ceiling Cassette,
  Ducted Concealed, Floor Mount, BC Controller/Branch Selector) components.
- **Hydronics/Plant** — Chiller (Air/Water-Cooled), Boiler (Gas/Electric/
  Oil), Air Handler (AHU), Makeup Air Unit (MAU); components: Circulator
  Pump, Expansion Tank, Fluid Cooler, Cooling Tower.
- **Other** — kept as a 6th bucket (not in Ed's spec verbatim, added so
  categories with no clean taxonomy fit — old ice machines, exhaust fans —
  have somewhere honest to land instead of being force-fit) with no preset
  list, same as the existing "Other" pattern.

Every System Type and Component Type dropdown ends with "Other (type
below)," matching `EquipmentTypeFields.tsx`'s existing pattern exactly —
nothing is ever a dead end for a type not on the list. That file was
rewritten in place (`src/components/EquipmentTypeFields.tsx`) into
`SystemTypeFields` (Category -> Type, + Configuration for split systems)
and `ComponentTypeFields` (Position -> Type where the category needs one).

### Component fields
Designation/Name, Brand/Manufacturer, Model Number, Serial Number,
Refrigerant Type, Voltage, Phase, MCA, MOCP — exactly the 8 fields
`nameplateOcr.ts`'s `extractNameplateFields` already returns, reused
as-is (no duplicated extraction logic).

### Database migration
`supabase/migrations/0007_systems_components.sql` (**not yet applied** —
this sandbox has no Supabase network access, same limitation as every
migration before it; needs a session with Supabase MCP access to run it) —
- Creates `systems` and `components` tables, owner-scoped RLS mirroring the
  `equipment` pattern in `0001_init.sql` exactly.
- Migrates every existing `equipment` row into `systems` **with zero
  components**, per Ed's explicit instruction — no component is
  auto-created, so nothing blocks a System from being saved without one.
  Decisions made and documented in the migration file itself:
  - The **id is preserved** (`insert into systems (id, ...) select id, ...
    from equipment`), so every existing `jobs`/`job_attachments`/`parts`/
    `diagnostic_readings` reference to an old equipment row keeps resolving
    to the same row under its new name.
  - The old `equipment_id` columns on those four tables are **renamed to
    `system_id`** and repointed at `systems(id)` — a real rename (same
    pattern as `jobs.customer_complaint` -> `reason_for_call` back on
    2026-09-25), not a compatibility alias, since every reference is
    updated in the same migration and in the app code below.
  - Old `equipment.category` (16 values) doesn't map 1:1 onto the new
    6-bucket taxonomy, so nothing is lost: every migrated row's new
    `system_type` is set to its old `subtype` (if it had one, with
    "Outdoor Unit — "/"Indoor Unit — " prefixed back on if
    `unit_position` was set) or its old category's label, preserved as
    free text even where the `category` bucket it lands in is only an
    approximate best fit (e.g. `heat_pump` -> `split_system`, `exhaust_fan`
    -> `other`).
  - Old nameplate fields (manufacturer/model/serial/refrigerant/voltage/
    phase/mca/mocp) have nowhere else to go once a migrated row has no
    component, so they're preserved as `legacy_*` columns on `systems` —
    populated only by this migration, never written to by the current
    System-creation UI, shown on `SystemDetail.tsx` when present.
  - The old `equipment` table (and its now-unused `equipment_category`
    enum) are dropped at the end of this same migration file, confirmed
    via a full codebase search that nothing queries it directly anymore.

### Local (Dexie/IndexedDB) side
`src/lib/db.ts` bumped to schema v3: `systems`/`components` tables replace
`equipment`; a real `.upgrade()` function converts any locally cached
`equipment` rows using the exact same category/system_type mapping logic
as the SQL migration (`mapLegacyEquipmentToSystem`, kept in lockstep with
the SQL by hand since there's no shared codegen), so a device that's been
offline a while and still has old cached rows converts the same way a
fresh pull from Supabase would.

### Everywhere else `equipment` was read/written, updated
`src/lib/repo.ts` (cascading delete now purges components + systems),
`src/lib/sync.ts` (synced-tables list), `src/screens/SiteDetail.tsx`,
`src/screens/CustomerDetail.tsx`, `src/screens/JobsList.tsx`,
`src/screens/JobDetail.tsx`, `src/screens/JobForm.tsx`'s inline "+ New
system" quick-add (deliberately lighter than before — just Category/Type,
no manufacturer/model/serial fields inline anymore, since that detail is
now per-component and the New Call screen isn't the right place to build
out a whole component list; a note in the UI says so), `src/components/
PhotoUploader.tsx` (`equipmentId` prop -> `systemId`). New `SystemForm.tsx`
and `SystemDetail.tsx` replace `EquipmentForm.tsx`/`EquipmentDetail.tsx`
(routes: `/systems/:id`, `/systems/:id/edit`, `/sites/:siteId/systems/new`).

**Job Detail's "Scan Nameplate" section** (`NameplateScanner.tsx`) needed a
real design change, not just a rename: a System has no nameplate of its
own anymore, so the scanner now targets one specific Component of the
job's System — a picker appears when the System has more than one
component, and the hint text on Job Detail now says "add a component to
this system first" instead of "link equipment first" when there are none.

The per-field draft autosave pattern (`formDraft.ts`) carries over
unchanged to `SystemForm.tsx`, including the full in-progress component
list (an array of plain objects, JSON-serializable like everything else
`saveDraft` already handles).

### Verification
`tsc -b` and `vite build` both pass clean.

Ran a real Playwright browser test against the local Vite dev server in
local-only mode (temporary `.env.local` — a throwaway PIN hash plus a
**fake** `https://fake.supabase.local` Supabase URL/anon key so the app's
existing auto-login code path runs for real; Playwright's `page.route()`
intercepted the `/auth/v1/token` call and fulfilled it with a synthetic
session — no real network call ever left the sandbox, and no real
credential was ever created or committed; `.env.local` was deleted before
finishing). This let forms that need a real signed-in owner id (which
several already required even before this change, e.g. `CustomerForm.tsx`)
actually save, not just render:
- **Legacy migration**: seeded a v2-shaped local database (using the app's
  own Dexie library and its actual pre-v3 `version(1)`/`version(2)` schema
  definitions, so this is the real upgrade path, not a simulation) with one
  `equipment` row (split-system, outdoor, "Heat Pump Condenser" subtype,
  full nameplate fields filled in), reloaded the app, and confirmed: the
  `equipment` object store is gone, a `System` now exists at the same id,
  `category` mapped to `split_system`, `system_type` reads "Outdoor Unit —
  Heat Pump Condenser", the legacy nameplate fields (manufacturer/model/
  etc.) are preserved on the System, it has zero components, and
  `SystemDetail.tsx` renders all of that correctly.
- Also ran the exact same category-mapping logic as a plain Node unit
  check (`mapLegacyEquipmentToSystem`, exported from `db.ts` for this)
  against a split-system-with-subtype case, a walk-in-cooler-with-no-
  subtype case (falls back to the category label), and an
  exhaust-fan case (lands in the new `other` bucket but keeps its real
  subtype text verbatim) — all correct.
- **Real create flow**: created a Customer -> Site -> System ("Split
  System #4") with 2 components (an outdoor Heat Pump Condenser named
  "Condenser 1," an indoor Gas Furnace named "Furnace 1"). For component
  1, used the *real* "Scan Nameplate — Choose from Library" button, a
  real file pick, and the real `runOcr()`/`extractNameplateFields()`
  pipeline — only the Tesseract.js module itself was stubbed (Playwright
  intercepted Vite's dev-bundled `tesseract__js.js` and replaced it with a
  fake `createWorker` returning fixed nameplate text, since this sandbox
  can't reach the real Tesseract CDN), confirming the extracted fields
  landed in component 1's fields specifically and did **not** touch
  component 2's. Saved, confirmed both components show correctly on
  `SystemDetail.tsx`, then did a fresh navigation (not just in-memory
  state) back to the same System and confirmed every field — including
  the scanned manufacturer/model/serial — round-tripped correctly through
  IndexedDB.

One real bug caught and fixed *during* this test, worth noting for future
OCR-stubbing tests: Vite's dev-mode CJS interop for a dynamic `import()`
reads the faked module's **default** export (mirroring how the real,
CommonJS-built tesseract.js becomes a `default` export after bundling) —
a stub that only exports `createWorker` as a named export silently loses
it (`m.default` is `undefined`, so the interop's property-spread copies
nothing), producing a confusing "createWorker is not a function" with no
indication the stub itself was the problem. Fix (test-only, not app code):
the stub also exports `default: { createWorker }`.

### Not yet verified — needs a real device / live Supabase session
- **The SQL migration itself has not been applied anywhere** — this
  sandbox cannot reach Supabase. It needs to be run by a session with
  Supabase MCP access, against the real `bxagejspufjuffadxkkl` project,
  before any of this is live. Read the migration file's own comments
  first — it documents every non-obvious decision (id preservation,
  column renames, category-mapping choices) inline.
- Real on-device test of the whole flow: create a System, add components,
  scan a *real* nameplate with a real phone and real Tesseract CDN access,
  confirm accuracy (same standing item as every other OCR feature in this
  app — see the multiple nameplate-scanner entries above).
- A device that already has real cached `equipment` rows in its local
  IndexedDB (from using the live app before this change) hasn't been
  tested going through the real Dexie v3 upgrade — the Playwright test
  above exercises the identical code path against synthetic data, but a
  real device's actual cached rows are the real test.
- Whether Ed wants a way to delete a whole System (cascading its
  components) from `SystemDetail.tsx` — not asked for in the spec, so not
  built; components can be removed one at a time from `SystemForm.tsx`,
  but there's no "Delete System" button (Equipment never had one either).

---

## 2026-09-26 (yet again still) — Independent review of the Systems/Components branch, 3 real bugs found and fixed

Before showing the hierarchical schema branch to Ed as mergeable, ran a
high-effort independent code review against the diff (not just trusting
the building agent's own report). Found three real, distinct problems:

1. **Silent data loss in the migration.** `0007_systems_components.sql`'s
   own header comment promised every old `equipment` field survives as a
   `legacy_*` column on `systems`, but six columns
   (`manufacture_date`, `nominal_capacity`, `compressor_model`,
   `filter_sizes`, `belt_sizes`, `warranty_notes`) had no `legacy_*`
   counterpart at all — they'd have been permanently destroyed the moment
   `drop table equipment` ran at the end of the same migration. Fixed:
   added all six as `legacy_*` columns on `systems`, included them in the
   migration's `insert`, and made the same fix in the local Dexie upgrade
   (`mapLegacyEquipmentToSystem` in `db.ts`) and the `System` type
   (`types/index.ts`), plus surfaced them on `SystemDetail.tsx` so
   migrated data isn't invisible once it lands.
2. **Real Dexie migration bug: reading a store the same version deletes.**
   `db.ts`'s v3 both deleted the `equipment` object store
   (`equipment: null`) and read from it inside that same version's
   `.upgrade()` callback — Dexie applies a version's schema diff (store
   deletion included) before running its `.upgrade()` callback, so
   `tx.table('equipment')` could throw or come back empty depending on
   timing, on every real device that has old cached equipment rows (i.e.
   every existing installed user) — exactly the population this migration
   says it protects. Fixed: split into v3 (adds `systems`/`components`,
   copies old equipment into them, leaves the `equipment` store physically
   present but unused) and a new v4 (`equipment: null`) that drops it only
   after the copy has already run. Verified for real, not just by
   reasoning about it: wrote a standalone `fake-indexeddb` + real Dexie
   script (temporary, removed after) that seeds a v1-shaped local DB with
   an equipment row and a job pointing at it, runs the actual v1→v4
   version chain from `db.ts`, and asserts the migrated System, the
   preserved `legacy_manufacturer`, the job's new `system_id`, and the
   dropped `equipment` store all come out correct — passed clean.
3. **The OCR sparse-text-mode fix (this same day, separate NOTES.md entry
   above) got silently reverted** — this branch was built from a point
   before that fix landed, so its copy of `ocr.ts` never had the `mode`
   parameter, and both nameplate scan call sites had regressed to
   Tesseract's plain default mode. Fixed by reapplying the exact same
   `mode: 'label' | 'document'` change here, with the two nameplate
   scanners passing `'label'` and the dispatch ticket scanner left on the
   default — same as the standalone fix already deployed.

`tsc -b` and `vite build` both pass clean after all three fixes.

### To pick this back up next
- Still not merged into `claude/hvac-hierarchical-schema-ocr-46oa7n` or
  deployed — this branch (`worktree-agent-a4c267fa1f3ebfe6b`) needs to be
  merged in (expect a small conflict on `NOTES.md`/`ocr.ts`/`.gitignore`
  against the sparse-text-mode fix already on the main branch, since they
  diverged from the same point), then the whole thing reviewed with Ed
  before it touches production or the real Supabase project.
- The SQL migration has still never been applied anywhere — needs a
  session with real Supabase MCP access.
- Real on-device test, and a real device with genuinely pre-existing
  cached `equipment` rows, are both still outstanding — everything above
  was verified with synthetic data through the real code paths, never a
  real phone.

---

## 2026-09-26 (still yet again) — Real raw OCR text finally in hand: model/serial were swapping with the wrong values

Ed re-scanned the same Heatcraft nameplate on the deployed sparse-text-mode
fix and this time got real text back — progress, since the previous scan
got literally nothing. But the result was actively wrong, not just
incomplete: "Model #" got filled with the word **"SERIAL"**, and "Serial #"
got filled with **"89626301"** — a Part Number, not a serial number.

Ed sent the actual raw OCR text this time (via "Show raw scanned text"),
which finally made the real cause visible instead of guessed at:

```
PART NO.
MODEL NO.
SERIAL NO
89626301 CZT050MECF
T16J11397
```

This plate prints its three labels stacked with no value between them,
then the three values as their own separate run right after. Collapsed to
one line (how `extractNameplateFields` reads it), that's `...PART NO.
MODEL NO. SERIAL NO 89626301 CZT050MECF T16J11397...` — so the old
"label directly followed by its value" regexes did exactly what they're
built to do and grabbed the *next word after the label*, which here is
either another label (`MODEL NO.` → captured `SERIAL`) or a different
column's value entirely (`SERIAL NO` → captured `89626301`, actually the
Part Number). Not a bug in the matching logic so much as a layout the
inline-style regexes were never going to handle correctly — same root
category of problem as the earlier VOLTS/PHASE/HERTZ table-header fix, just
a different pair of fields.

**Fix** (`src/lib/nameplateOcr.ts`):
1. `findModelSerialFromLabelBlock()` — detects the stacked-labels shape
   (`MODEL NO. SERIAL NO.`, optionally preceded by `PART NO.`) and reads
   the values positionally from the run of tokens right after: skip Part
   No.'s value if present, then take the next two digit-containing tokens
   as model, then serial, in that order. Used whenever the stacked shape
   is detected, overriding the inline regexes rather than only filling
   gaps, since the inline result is actively wrong in this shape, not just
   missing.
2. A small standing defense added either way: `rejectLabelWord()` throws
   out a model/serial "match" that's actually just a label word (SERIAL,
   MODEL, PART, NUMBER, NO, TYPE, VOLTS, PHASE, HERTZ, WEIGHT) — cheap
   insurance against the same failure mode showing up in a shape not
   explicitly handled yet.

**Verified for real this time** — not hand-transcribed guesswork: bundled
the actual `nameplateOcr.ts` module with esbuild and ran it directly
against Ed's real raw OCR text (copy-pasted verbatim, cracked/garbled
lines and all) in Node. Confirms `model_number: "CZT050MECF"` and
`serial_number: "T16J11397"` — the real serial, correctly placed. (Tesseract
itself still misreads a couple of characters in the model number, "050ME"
vs. the plate's actual "069M6" — that's OCR character-recognition noise,
not a labeling bug, and exactly why every scan still says to review each
field before saving.) Also re-ran the previous clean/simple nameplate test
cases through the same real module to confirm no regression — both still
extract every field correctly.

Voltage/phase/refrigerant/manufacturer came back blank on this real scan —
checked the raw text and confirmed that's a genuine OCR-quality miss on
this specific noisy capture (the manufacturer word is entirely absent from
what Tesseract read, and the voltage/phase table row is too garbled to
safely parse), not a regex bug to chase — blank is correct here, a wrong
guess would be worse.

`tsc -b` and `vite build` both pass clean.

### To pick this back up next
- Not yet deployed — needs the same PR-and-merge step as the last few
  fixes.
- Ed to re-scan and confirm model/serial land correctly this time — if
  voltage/phase/manufacturer keep coming back blank on real scans (as
  opposed to being wrong), that's expected given this photo's OCR quality,
  not a bug — worth another look only if a *clean, well-lit* nameplate
  photo still can't get those fields.

---

## 2026-09-26 (one more) — Crop-before-scan step, per Ed's request ("don't recreate the wheel")

Ed asked to research how others solve this exact problem before building
more blind fixes. Checked Tesseract's own project docs plus a comparable
open-source nameplate-OCR tool (PlateLens, MIT-licensed) — both treat
**cropping to just the label before OCR runs** as the standard, most
reliable fix for "small text lost in a large busy background," more
dependable than a page-segmentation-mode setting alone (which is what the
sparse-text fix earlier today already was). Ed picked this over a cheaper
"try OCR twice automatically" option — wanted the more reliable fix, not
a shortcut.

### What was built
- **`src/lib/ocr.ts`**: `preprocessImage()` now takes an optional `CropRect`
  (`{x,y,width,height}` as 0..1 fractions of the source image, resolution-
  independent) and crops to it before applying the existing contrast/
  grayscale pass. Fully backward compatible — omitting it behaves exactly
  as before, so `DispatchScan.tsx` (photographs a mostly-text card, doesn't
  need cropping) is untouched.
- **`src/components/ImageCropper.tsx`** (new): a drag-to-crop step shown
  right after a photo is picked, before OCR runs — a movable, resizable
  box (drag the body to move, drag any corner to resize) over the photo,
  with "Scan This Area" and "Use Full Photo" (skip cropping) buttons.
  Built with plain pointer events (no new dependency), sized for a finger
  (26px handles).
- Wired into both nameplate scanners — **`NameplateScanButton.tsx`** (New
  Equipment/System quick scan) and **`NameplateScanner.tsx`** (Job Detail's
  per-component scan): picking a photo now loads it and shows the cropper
  instead of immediately running OCR; OCR only starts once the tech taps
  "Scan This Area" or "Use Full Photo". The dispatch ticket scanner is
  unchanged (doesn't need this).

### Verified for real, not just by reading the code
Ran the actual dev server in local-only mode (temporary throwaway PIN,
nothing committed) and drove it with a real headless Chromium via
Playwright (temporarily installed, not saved to package.json/committed):
- **Crop math**: imported the real `ocr.ts` module directly in-browser via
  the dev server (no mocking) and fed `preprocessImage` a synthetic
  4-quadrant test image with a known crop rect — confirmed the cropped
  canvas has the exact expected pixel dimensions and pulls the correct
  quadrant's content (checked via average pixel brightness), not just
  "doesn't crash."
- **Real drag interaction**: uploaded the actual Heatcraft nameplate photo
  Ed sent earlier, into the real `NameplateScanButton` UI on the New
  System form. Located the crop box and its corner handles by their real
  rendered position (not assumed math) and drove real mouse-drag
  sequences: dragging the bottom-right handle shrinks the box correctly
  without moving its top-left corner; dragging the box body moves it
  without changing its size. (First attempt at this test failed for a
  boring reason — the crop box rendered below the default test-viewport
  fold, so the simulated clicks landed off-screen; fixed by sizing the
  test viewport to fit the whole cropper, not a real app bug.)
  Confirmed via temporary debug logging that the pointer-capture-based
  drag handlers actually fire in a real browser (not just typecheck) —
  removed before committing.
  Then confirmed tapping "Scan This Area" carries the chosen crop through
  into the real `runOcr()` call — this sandbox still can't reach the
  Tesseract CDN, so the OCR call itself fails exactly as it always does
  here, but it fails through the app's existing clean error path (no
  crash), proving the crop rect reached the real pipeline.

`tsc -b` and `vite build` both pass clean.

### To pick this back up next
- Not yet deployed — needs the same PR-and-merge step as the last several
  fixes.
- **Real test still needed**: Ed to try the actual crop-then-scan flow on
  his phone with a real nameplate and real Tesseract — touch-drag on a
  real device (vs. simulated mouse events here) is the one thing this
  sandbox genuinely cannot verify.
- If cropping tighter to the label doesn't noticeably improve real
  accuracy, the next thing to try (per the same PlateLens research) would
  be multiple OCR passes (different rotations/contrast) merged together —
  a bigger change, intentionally not built yet since Ed wanted the
  cropping fix tried first.
