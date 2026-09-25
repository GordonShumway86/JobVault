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
