# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Latest, launch round: making the repository presentable and honest for a first visitor. The README quickstart was followed literally on a fresh clone from GitHub (clone, `npm ci --ignore-scripts`, hash a password, build, start, sign in, load demo data, open every page): it works as written.

### Added

- `docs/demo.gif` at the top of the README, recorded from the running app with demo data by the new `scripts/demo.mjs` (Playwright video, converted with ffmpeg): a drag to Screening, an application's timeline and prep, the tailor's gap report, analytics.
- README sections: "Compared with other options" (spreadsheet, Trello/Notion, Huntr/Teal, Jobscan, and when to pick each instead), "Contributing", and every screenshot in `docs/screenshots` in the gallery (question bank and import/export were unused).
- `CONTRIBUTING.md` (setup, the checks CI runs, conventions), `SECURITY.md` (private reporting, scope, known by-design limits), issue templates for bugs and feature requests that ask for demo data, never real applications.
- `assets/social-preview.png` (1280x640, the logo and the real board screenshot). GitHub only takes a social preview through the web UI: Settings, General, Social preview.
- Repository description reworded; topics `typescript`, `interview-prep`, `job-application-tracker` added.

### Fixed

- Data loss: **Load demo data** on an empty board deleted the question bank (and the weekly goal), because it only checked for applications while the seed replaces everything. Someone who starts by filling the question bank lost it in one click. The button is now only offered, and the action only runs, when there are no applications and no questions (`isEmptyTracker` in `src/lib/seed.ts`); otherwise the board says why. Found by the Codex review of this round.
- Resume tailor, with `ANTHROPIC_API_KEY` set: a refused or failed rewrite emptied the bullets box (React resets a form after its action), and a dropped connection replaced the page with the error screen, losing a pasted job description. The rewrite form now uses `useFormAction` like the other forms, which is now generic over the action's state. Checked in Chromium against an unreachable API endpoint and offline.
- An API error without a status (a connection failure) read "API error : Connection error."; it now reads "API error: Connection error.".
- `src/lib/ai.test.ts` returned the mock from `beforeEach`, which Vitest runs as a teardown, so it called the Claude client mock after every test; a test of a rejected call failed because of it.
- README accuracy: the tailor's vocabulary has 122 skills and tools, not "about 140"; migrations run when the app first opens the database, not "on startup"; the AI rewrite also sends the list of missing keywords; sign-in and the health check are the routes without a session check; CI fails on moderate or worse runtime advisories, not on any; "no tracking" is gone (Next.js build telemetry is on unless `NEXT_TELEMETRY_DISABLED=1`); the resume text is kept in the browser only and is not in exports. Most were found by the Codex review.

### Checked, nothing to change

- Delete buttons, "Mark done", "Load demo data" and the weekly-goal form while offline: the in-app error page appears and **Try again** brings the page back once the connection is back (run in Chromium with "Delete question"; the others are the same plain `<form action>` pattern). Nothing typed is lost except a weekly-goal number. If the request reached the server before the connection dropped, the action did happen; a reload shows it. Left as is and listed in the README roadmap.

### Notes for the next agent

- `SECURITY.md` points to GitHub's private vulnerability reporting "if the Security tab shows it". It is currently disabled on the repository; enabling it is a repository setting the owner can turn on.
- Regenerate `docs/demo.gif` after UI changes: `node scripts/demo.mjs <baseUrl> <password> docs/demo.gif` against a freshly seeded instance (it moves the Saltmarsh Studio card), then reseed. Keep it under about 4 MB.
- Still open: the AI rewrite is only tested with a mocked client (no key available), no manual theme switch, no `script-src` CSP, 4 dev-only drizzle-kit advisories.

Earlier, reliability round: the app was pushed with odd, empty, huge, non-English and malformed input, dropped connections and long names, in a real browser and against `src/lib`. Each bug below was reproduced first, got a failing test (vitest or the Playwright smoke test), then the fix.

### Fixed

- A server-side validation error on the add/edit application form ("Minimum salary is above the maximum", a future date) wiped every field, including a pasted job description: React resets a form after its action. The application, question, contact, stage-date and note forms now share `useFormAction` (`src/app/(app)/use-form-action.ts`), which refills the form with what was submitted, and remounts it with `key` so selects do not snap back to their first option.
- A dropped connection while saving any of those forms, or while adding a note, replaced the page with the error screen and lost the typed text. The form now stays, keeps the text and says the connection dropped or the server failed. Notes go through a new client `NoteForm`; `addNote`/`updateNote` return a form state.
- Moving a card on the board while offline (or on a server error) replaced the whole board with the error screen. The board now stays, the card goes back to its column and an alert names the move that failed. Signing out in another tab still redirects to the sign-in page.
- A long unbroken company name or location stretched its board card under the neighbouring columns (the card link could not be clicked) and made the application page scroll sideways.
- The tailor's "repeated words" list split non-ASCII words: "développeur" came out as "veloppeur". Words are now matched in any script.
- Import: a semicolon-separated CSV (what spreadsheets set to a European locale save) was refused with "needs company and role columns"; the separator is now detected from the header line.
- Import: CSV round trips dropped a leading apostrophe from text such as `'=x`, because the formula guard and the import's stripping did not account for one. "'s-Hertogenbosch" still exports unchanged.
- Import: dates Date.parse reads leniently were stored as nonsense, such as "5" as 2001, a spreadsheet serial "45000" as the year 45000, and "2026-02-30", "02/30/2026" or "2026/02/30" as March 2. Dates now need a four-digit year, at most 9999, a real calendar day, and may not be more than a day in the future.
- Import: the semicolon detection also handles a blank first line and quoted commas in the header; a leading apostrophe before a tab round-trips; a resume word typed with a combining accent matches the precomposed one in the tailor.
- Import: an application whose `stage` disagrees with its last stage change (board says Offer, timeline says Applied) was accepted; it is now refused with the record named.
- Import: an object or list where text was expected was saved as "[object Object]"; `str` in `src/lib/validate.ts` now refuses it. Errors from a contact, note or question inside a JSON file now name the record ("Application 3: name is longer than 200 characters.").
- The error screen said every failure happened "on the server"; it now mentions a dropped connection too.

### Checked by review

- A Codex review of this round found the Feb 30 / slash-date rollover, the semicolon and apostrophe corner cases and the combining accent above, plus one regression made earlier in this round (stage changes were inserted in a single statement, so an application with about 9,000 of them hit SQLite's variable limit); all fixed with tests.
- The unit suite also passes with `TZ` set to America/Los_Angeles, UTC and Asia/Kolkata (it normally runs in Pacific/Auckland).

### Added

- Smoke test: the question bank (adding a question clears the form and shows it as interview prep), the offline cases above, a refused save keeping its fields, and a long-name import.

### Checked, nothing to change

- `gapReport` on 30,000-character inputs (the textarea limit) of repetitive or pathological text runs in under 10 ms; no regex backtracking problem.
- Odd URLs (`/applications/abc`, `-1`, `1.5`, huge numbers) return 404; empty, blank-line-only, binary, UTF-16 and deeply nested JSON files are refused with a message, never a crash.
- `onDay` across the Pacific/Auckland DST changes keeps the chosen calendar day.

### Notes for the next agent

- Any new form whose server action returns `FormState` should use `useFormAction` and give the `<form>` `key={key}` and its fields `defaultValue={value("name", saved)}`. Plain `<form action={serverAction}>` is fine only for button-only forms (delete, mark done), where nothing typed can be lost.
- Still open from earlier rounds, outside this round's scope: the AI rewrite is only tested with a mocked client (no key available), no manual theme switch, no `script-src` CSP, 4 dev-only drizzle-kit advisories.

Earlier, feature round: correcting stage history. Using the app as a newcomer showed two ways the analytics went wrong with no fix in the UI: a card moved to the wrong column and back (Applied, Offer, Applied) counted as an offer in the funnel for good, and every application entered after the fact was dated today, so the weekly chart and time to reply were wrong from day one.

### Added

- Each stage change on an application's timeline has an **Edit** panel: change its date, or **Remove this change** (not offered for the first entry). Redating keeps the local time of day; a date before the previous change or after the next one is refused with a message naming that change, and on a neighbour's day the time is nudged by a millisecond so the order holds (refused if that would cross midnight or pass the current time; both found by a Codex review of this round). Redating the first entry also moves the application's "Added" date. Removing re-links the following entries, drops a move straight back to the same stage, and sets the application's stage to its last remaining entry (`setEventDate`, `removeEvent` in `src/lib/data.ts`; actions `updateEventDate`, `removeEvent`).
- The add-application form has a **Date** field: the day the application reached its stage, if not today. Future dates are refused (`pastDay` in `src/lib/validate.ts`).
- Tests: redating (order, neighbour limits, nudging, never after now, first entry carries the application date), removing (misdrop no longer counted by `funnel`, re-linking, moving the stage back, first entry refused), `onDay` across the Auckland/UTC date line, `pastDay`; the smoke test backfills a date on a new application and removes a wrong move from the timeline.

### Changed

- README screenshots regenerated; the dark one now shows a stage change's date panel.

### Notes for the next agent

- Event order is by `at` (then id); `setEventDate` guarantees strictly increasing timestamps per application, which `analytics.ts` relies on to find the "sent" event.
- `onDay` in `src/lib/format.ts` uses the server's `TZ`, like `today()` and the analytics weeks.
- Still open from earlier rounds: the AI rewrite is only tested with a mocked client, no manual theme switch, no `script-src` CSP, 4 dev-only drizzle-kit advisories.

Earlier, security pass: auth, sessions, input validation, injection and SSRF sinks, XSS, headers, git history, dependencies, CI and Docker defaults were reviewed, and each finding was checked against the running app before it was fixed.

### Fixed

- Saving a contact with a link the server refuses (the browser's `type=url` lets `javascript:` and `ftp:` through) did nothing and said nothing. Contacts now go through `parseContact` in `src/lib/validate.ts` (name, email shape, http(s) link, lengths), and the form shows the error and keeps what was typed (`contact-form.tsx`).
- Security: sessions survived a password change. Tokens were stored as a plain SHA-256, so a cookie kept working for up to 30 days after `OFFERLOG_PASSWORD_HASH` was replaced or removed. The stored digest is now an HMAC keyed by the password hash, and nothing counts as signed in while the hash is unset. Everyone signs in once more after this upgrade.
- Security: the per-client login limit used the first `X-Forwarded-For` entry, which the client controls even behind a proxy. It now uses the last hop (`clientKey` in `src/lib/rate-limit.ts`). The global 30-per-15-minutes limit was and still is the backstop when there is no proxy.
- Security: the JSON/CSV export (a full personal backup) had no `Cache-Control`; it is now `no-store`.

### Added

- Response headers on every route: `frame-ancestors 'none'` and `X-Frame-Options: DENY` (no clickjacking), `nosniff`, `base-uri`/`form-action`/`object-src` limits, `Referrer-Policy: same-origin` (`next.config.ts`).
- CI fails on a moderate or worse advisory in a runtime dependency (`npm audit --omit=dev`), and `actions/checkout` no longer persists the job token.
- `compose.yaml` publishes the port on `127.0.0.1` only, since the app speaks plain HTTP; the README says to put a TLS proxy in front for other devices.
- Tests: `src/lib/session.test.ts` (session lifecycle, logout replay, password-hash rotation), `parseContact` and `clientKey` cases, and smoke-test checks for the contact error, the headers and the export's `no-store`.

### Checked, nothing to change

- Signed-out requests to every page, including RSC and segment-prefetch requests with real router-state headers captured from a browser, all get an empty 307; every page, route and server action checks the session itself.
- No SSRF, path, shell or raw-SQL sinks (the only outbound call is the Anthropic SDK); no `dangerouslySetInnerHTML`; user links are limited to http(s) and rendered with `rel="noopener noreferrer"`.
- Git history has no keys, tokens, `.env` or database files.
- `npm audit` lists 4 moderate advisories, all in drizzle-kit's bundled esbuild dev server (dev-only, never started; `npm audit fix --force` would downgrade drizzle-kit to 0.18). Runtime dependencies have none.
- A Codex review of this round's diff and the auth code found no further problems.

### Notes for the next agent

- `src/lib/session.ts` now uses relative imports like the rest of `src/lib`, so vitest can load it; its test mocks `next/headers` and uses an in-memory database.
- There is no `script-src` CSP: Next's inline scripts would need per-request nonces. React escapes all user text, so this is a recorded shortcut, not a known hole.
- The `/security-review` skill could not run in this session (it needs the agent's working directory to be a git repo), so the review was done by hand.
- Still open: the AI rewrite is only tested with a mocked client (no key was available), and there is no manual theme switch.

Earlier, design and UX pass: every page was checked in real screenshots at 1440px and 390px, in light and dark, and with an axe-core WCAG 2.2 AA scan (no violations left on any page in either theme).

### Added

- Dark theme that follows the system setting. All colours are tokens on `:root` in `src/app/globals.css`, redefined once under `prefers-color-scheme: dark`.
- Edit notes, prep notes and contacts in place. Each has an "Edit" panel with Save and Delete (`updateNote`, `updateContact` actions). A note keeps its date and stage when edited.
- Form buttons on the application page disable themselves while the server action runs (`SubmitButton`), so a slow save cannot be sent twice.
- Skip link, a title per page ("Board – offerlog"), an in-shell error page with a retry button, and a not-found page for deleted applications.
- The smoke test edits a note and a contact; README shows dark and phone screenshots, all regenerated by `scripts/screenshots.mjs`.

### Fixed

- Security: the per-application page title added in this round looked up the application before checking the session, so a signed-out request to `/applications/<id>` got a 307 whose body still named the company and role. `generateMetadata` now calls `requireUser()` first, and the smoke test checks a signed-out response for the company name. Found by the Codex review.
- On phones the board showed seven 158px slivers; columns now take 78% of the width and snap one at a time.
- On phones, short pages (such as not-found) split the spare height between header and content, so the nav bar ballooned to about 360px.
- `scripts/screenshots.mjs` loaded the tailor with `?app=1`, which is empty after a reseed; it now picks the job by name.
- Funnel counts were white on the bar colour, which failed contrast on amber. They now sit beside the bar.
- Tabular figures split "6.5 d" into "6 . 5 d" in this typeface; they are now only used for bare integers.
- "1 offers" and "Imported 1 applications." are pluralised correctly.
- Prep notes had a stray list indent; the tailor's two textareas did not line up; empty analytics drew coloured ticks for zero bars and gave no hint; the empty board showed a useless filter; the sidebar stopped short on long pages.
- Light-theme red links on grey panels and the dark-theme "Offer" pill were under 4.5:1 contrast.

### Notes for the next agent

- New colours go in as tokens in both the light block and the dark block; do not hard-code hex values in components. Stage colours are shared by both themes on purpose.
- Phone overrides for components live in the last `@media (max-width: 760px)` block of `globals.css`, because an earlier media query loses to base rules declared after it.
- Edit panels are `<details>` keyed by their saved content, so a successful save remounts them closed without client state.
- A Codex review of this round's commits ran (after two usage-limit failures) and found the metadata leak above; nothing else was reported. Any new `generateMetadata` must call `requireUser()` before touching the database.
- The AI rewrite is still only tested with a mocked client; no key was available.

Earlier, first-run review: a fresh clone was set up by following the README literally, and the code was then reviewed.

### Fixed

- The Import & export page (`src/app/(app)/data/`) was never committed, because the `.gitignore` rule `data/` also matched it. A fresh clone returned 404 on `/data`. The rule is now `/data/`, and the smoke test imports a CSV through that page.
- `npm run db:seed` now loads `.env.local`, so it seeds the same `OFFERLOG_DB` file the app uses.
- The weekly analytics chart buckets weeks in the server's `TZ`, not UTC. With `TZ` ahead of UTC, an application sent early on a Monday used to count toward the previous week. Demo next-step dates are also local now, matching the "Due today/tomorrow" labels.
- The README and `engines` now say Node 22.18+, which plain `node scripts/*.ts` needs.
- `next dev` no longer writes an untracked `AGENTS.md` into the checkout (`agentRules: false`).

### Added

- The smoke test covers drag and drop on the board.

### Notes for the next agent

- Unit tests run with `TZ=Pacific/Auckland` (set in `vitest.config.ts`), so code that mixes UTC and local dates fails there. Build test dates with local constructors (`new Date(2026, 10, 22, 12)`), not `...Z` strings, when the local calendar day matters.
- Never use bare directory names in `.gitignore` that could match folders under `src/`. Anchor them with a leading `/`.
- Still not done: editing a note or contact in place, a dark theme, and a live test of the AI rewrite against the real API (it is only tested with a mocked client).

## [0.1.0] - 2026-11-22

### Added

- Kanban board with seven stages (wishlist, applied, screening, interview, offer, rejected, ghosted), drag and drop plus a per-card stage menu, a text filter, and an "Up next" strip of due and overdue next steps.
- Applications with company, role, link, salary range and currency, location, work mode, source, job description and a dated next step.
- Per-application timeline built from recorded stage changes and dated notes; contacts; interview prep notes per stage linked to a question bank.
- Resume tailor: deterministic local keyword gap report (skills, tools, seniority words, repeated posting words) and an optional Claude rewrite of bullet points when `ANTHROPIC_API_KEY` is set.
- Analytics: funnel with stage conversion, response rate and median time to reply by source, applications per week against a weekly goal.
- CSV and JSON import/export (validated, all-or-nothing imports; JSON is a full backup).
- Single-user login: scrypt password hash from `OFFERLOG_PASSWORD_HASH`, hashed session tokens in an HttpOnly cookie, rate-limited sign-in.
- Fictional demo data (button on an empty board, or `npm run db:seed`).
- Unit tests (vitest), a Playwright smoke test, Dockerfile, compose file with a health check, and GitHub Actions CI.

### Notes for the next agent

- Analytics definitions: an application is "sent" at its first move past wishlist (rejected/ghosted imply sent); replies are moves to screening, interview, offer or rejected; reply time is only known when an `applied` event exists. Funnel, replies and the weekly chart all use this one anchor.
- Install with `npm ci --ignore-scripts`: better-sqlite3 ships prebuilt binaries, and without the flag npm 10 tries a node-gyp build that fails on slim images and machines without a compiler.
- A Codex review pass found, and a follow-up commit fixed: silent text truncation, lenient JSON import lists, inconsistent analytics cohorts, double-counted aliases.

- Domain logic lives in `src/lib/` and is framework-free and unit tested; pages and server actions are in `src/app/`. Every server action must call `requireUser()` first.
- Scripts run with Node's built-in type stripping, so files under `src/lib` and `src/db` use relative imports with `.ts` extensions and no TypeScript-only runtime syntax (enums, parameter properties).
- Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.
- `scripts/screenshots.mjs <baseUrl> <password> docs/screenshots` regenerates README screenshots from a running, seeded instance.
- Roadmap items are listed in the README.
