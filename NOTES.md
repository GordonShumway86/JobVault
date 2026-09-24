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
