# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Latest, second security round. Probed a running `next start` with demo data. A server action POST with a foreign `Origin` is refused (500, no effect). 60 parallel wrong passwords with 60 different `X-Forwarded-For` values got 29 "Wrong password." and 31 "Too many" (the global limit holds under concurrency). Signed-out requests to every page, the `?app=` tailor link, RSC requests, the `.ics` export and the `jobDescription` and `moveApplication` actions return nothing from the database (checked by grepping for demo company names; the database was unchanged). `/_next/image` refuses both the export URL and absolute URLs. Redirects are relative even with a forged `Host` or `X-Forwarded-Host`. The three pinned action SHAs match their tags (checked with `gh api`). No secrets turned up in the full git history. `npm audit` shows nothing for runtime dependencies.

### Fixed

- Security: the password hash used Node's scrypt defaults (N=2^14, r=8, p=1, about 23 ms per guess here), below OWASP's minimum. New hashes use p=5 (N=2^14, r=8, p=5 is one of OWASP's equivalent minimums: same 16 MB, about 107 ms) and store the cost as `scrypt:16384:8:5:<salt>:<hash>`. Old `scrypt:<salt>:<hash>` values still verify. Re-running `node scripts/hash-password.ts` upgrades a hash and signs out existing sessions. A stored cost above N=2^17, r=32 or p=16, or a malformed one, is refused instead of hashed.
- Security: a contact email such as `sam@example.com?bcc=eve@example.net` or `...?cc=eve%40example.net` passed validation and became a `mailto:` link that silently adds recipients or a body. Emails may no longer contain `? & % # / \ : ; , < > "`.
- Security: the JSON import skipped the contact checks, taking any email and silently dropping a bad profile link. Imported contacts now go through `parseContact`, and an invalid one stops the import with `Application N contact: ...` (all or nothing, as for other fields). Contacts without a name are still skipped. One behaviour change: an old backup holding a bad contact link is now refused instead of imported without the link.
- Security (prompt injection): a pasted job description containing `</job_description>` could close its block and add text that reads as instructions. In the prompt, the tags `job_description`, `missing_keywords` and `bullets` inside pasted text are written as `&lt;...`, and the system prompt says the posting is data, not instructions. This is a mitigation, not a guarantee: the rewrite is still a suggestion the user reads before copying.

### Checked, nothing to change

- CI: `permissions: contents: read`, actions pinned to full SHAs, `persist-credentials: false`, `npm ci --ignore-scripts`. The Docker image runs as `node`; `.dockerignore` keeps `.env*` and databases out.
- Login rate limit: the scrypt check stays synchronous, because the limiter relies on no other request running between its check and its count (comment added in `password.ts`).

### Notes for the next agent

- `/security-review` still cannot run (the agent's working directory is not a git repository), and Codex was over its usage limit again, so this round was reviewed by hand plus the probes above.
- Not changed: the `node:22-bookworm-slim` base image is not pinned to a digest (pinning without Dependabot would freeze security updates); the SQLite file is created with the default umask (0644), which matters only on a host shared with other Unix users.
- Still open: a 2,000-card board has about 28,000 DOM nodes; the AI rewrite is only tested with a mocked client; the social preview needs a manual upload; private vulnerability reporting is off; no manual theme switch; no `script-src` CSP; 4 dev-only drizzle-kit advisories; `docs/demo.gif` not regenerated.

Earlier, design round. Every page was screenshotted from `next start` with demo data and with an empty database, at 1440px and 390px, in light and dark, plus a keyboard-only pass over the board. The app already had a consistent token system, visible focus rings, reduced-motion handling and good empty states; the fixes below are what still looked broken, ragged or inconsistent.

### Fixed

- The weekly goal typed before a failed save (offline, server error) snapped back to the saved goal (reported as a gap last round; reproduced in Chromium: typed 7, it showed 4). React resets a form after its action even when `SubmitButton` catches the failure, and the reset lands in the action's transition, after an ordinary state update. `SubmitButton` now records the failed submission in a transition (so it commits with the reset) and an effect writes the typed text, number, date and menu values back. The smoke test types a goal offline and checks it stays.
- An unknown address (`/anything`) showed Next.js's built-in black-and-white 404 page, in neither theme. `src/app/not-found.tsx` shows the app's own panel with **Back to the board**; the smoke test checks the 404 status, the link and axe in light, dark and 390px.

### Changed

- Add/edit application form: fields were poured into an auto-fill grid, so rows ended ragged (Source alone on a row, Work mode alone, Next step due alone, the currency box as wide as a salary). Fields now sit in rows of related fields that always fill the width: company and role; stage, date and source; location and work mode; salary from, to and a narrow currency; the posting link; next step (wide) and its due date; the job description. One column on phones, except the salary row.
- Text fields, date fields and menus share one 38px height, the same as the buttons; native menus were 4px shorter, so mixed rows did not line up. The board card menus keep their compact size.
- Question bank: the stage filter was a row of underlined links told apart only by bold; it is now a row of pill links with the current one outlined (`aria-current` unchanged).
- The import file picker used the browser's grey "Choose File" button; it is styled like the app's secondary controls and is as tall as the buttons.
- Page intro lines stop at 75 characters instead of running the full width of a wide screen.
- Resume tailor: an empty chip list ("None") had no space above it, unlike the other report lines.
- README screenshots regenerated from the running app with freshly seeded demo data (`scripts/screenshots.mjs`).

### Checked, nothing to change

- Empty states (board, analytics, question bank) give a next action; focus rings are visible on the sidebar, the Up next strip and the board; `prefers-reduced-motion` already turns off the one transition (column drop highlight). Pages answer in milliseconds, so no loading skeletons were added.
- `docs/demo.gif` and `assets/social-preview.png` do not show the changed screens and were left as they are.

### Notes for the next agent

- `SubmitButton` restores text inputs, textareas and selects after a failure; checkboxes and radios are skipped on purpose (their state is `checked`, not `value`). No form using `SubmitButton` with `formAction` has one yet.
- The board at 1440px still wraps longer company names onto two lines (seven 158px+ columns). Left as is: seeing every stage without scrolling sideways was the earlier choice.
- Codex review unavailable again (usage limit until 09:32 local); the restore logic was reviewed by hand, which is where the checkbox guard came from.
- Still open: a 2,000-card board has about 28,000 DOM nodes; the AI rewrite is only tested with a mocked client; the social preview needs a manual upload; private vulnerability reporting is off; no manual theme switch; no `script-src` CSP; 4 dev-only drizzle-kit advisories.

Earlier, first-run round: the repository was cloned fresh from GitHub into an empty folder and the README quickstart followed literally (`npm ci --ignore-scripts`, hash a password, build, `npm start`, sign in, add an application, load demo data, open every page, `npm run db:seed`). Everything worked as written; the fixes below are what a first user would still trip over.

### Fixed

- Offline (or on a server error), **Mark done**, **Delete application**, **Delete note**, **Delete contact**, **Remove this change**, **Delete question**, **Save goal**, **Load demo data** and **Sign out** replaced the page with the in-app error screen (listed on the roadmap since the launch round). `SubmitButton` now takes the action as `formAction`, catches a failure and shows "Not sent: the connection dropped or the server failed. Try again." under the button; the page, and anything typed elsewhere on it, stays. Redirecting actions (delete application, load demo data, sign out) still navigate when they succeed. Checked in Chromium offline, then online, for Load demo data, Mark done, Delete note, Delete application, Save goal, Delete question and Sign out (Delete contact and Remove this change use the same button); the smoke test covers **Mark done** and **Sign out**. A weekly-goal number typed before a failed save goes back to the saved goal.
- Security: `npm start` and `npm run dev` listened on every network interface, so a fresh install served its plain-HTTP sign-in page to the whole Wi-Fi (Next.js even printed the LAN address), while compose binds Docker to loopback for exactly that reason. Both now listen on `127.0.0.1`; `npm start -- -H 0.0.0.0` opens it up (checked: the last `-H` wins). The README quickstart says so.
- The board said "1 applications".

### Checked, nothing to change

- The AI rewrite request (`src/lib/ai.ts`) against the current Claude API guidance: model id, the `server-side-fallback-2026-07-01` beta with `fallbacks: "default"`, `output_config.effort`, `max_tokens` for a non-streaming call and the refusal check are all current. Still not run against the real API (no key here).
- `scripts/hash-password.ts` with piped stdin (non-TTY) writes one clean `OFFERLOG_PASSWORD_HASH=` line; Node 22.23 runs the TypeScript scripts directly.

### Notes for the next agent

- New buttons that run an action with nothing typed: `<form><input type="hidden" .../><SubmitButton formAction={action}>`, never `<form action={action}>` (that one shows the error page when offline). CONTRIBUTING says so too.
- `removeEvent` returns an error string from `src/lib/data.ts` (entry gone, first entry) that the server action ignores; the UI never offers those cases, so it was left.
- Codex review unavailable again this round (usage limit until 09:32 local).
- Still open: a 2,000-card board has about 28,000 DOM nodes; the AI rewrite is only tested with a mocked client; the social preview needs a manual upload; private vulnerability reporting is off; no manual theme switch; no `script-src` CSP; 4 dev-only drizzle-kit advisories.

Earlier, performance and accessibility round. Measured first with a Playwright script against `next start` (demo data, and a copy with 2,000 applications of about 4.9 KB job description each), axe-core 4.10.3 (WCAG 2.2 AA + best practice) on every page in light, dark and at 390px, and a keyboard-only walk through the board and the application page. Then the top offenders were fixed and measured again.

### Measured (Chromium, local, median of 3 to 5 loads)

| What | Before | After |
| --- | --- | --- |
| `/tailor` HTML with 2,000 applications | 9,858 KB decoded (79.5 KB gzip), TTFB 91 ms | 300 KB decoded (32.9 KB gzip), TTFB 24-29 ms |
| Board with 2,000 cards: first paint / load event | 396 ms / 461 ms | 208 ms / 213 ms |
| JSON export, 20,000 notes on one application | 310 ms | 12 ms |
| axe-core violations | sign-in: `landmark-one-main`, `region`; analytics at 390px: `scrollable-region-focusable` | none on any page, light, dark or 390px |

Unchanged and fine: with demo data every page answers in at most 17 ms; each page loads 137-142 KB of compressed JavaScript (Next.js and React only, no other client libraries) and 4.3 KB of CSS; a fresh database and server are healthy in 0.26 s; `listApplications` reads 2,000 rows in 11-16 ms.

### Fixed

- Performance: the resume tailor sent every saved job description to the browser to fill its job picker; with a long search the page was megabytes. It now sends labels only and fetches one description when it is picked (`jobDescription` server action, session-checked). A failed fetch says so (`role="alert"`) and a slower answer for an earlier pick cannot overwrite a later one.
- Performance: off-screen board cards skip layout and paint (`content-visibility: auto`); focus rings and drag and drop are unchanged (checked in screenshots and the smoke test).
- Performance: the JSON export grouped notes, contacts and stage changes by copying each list for every row (quadratic per application).
- Accessibility: choosing a stage in a card's menu moved the card to another column and dropped keyboard focus to the top of the page, silently. Focus now stays on that card's menu and a polite status says "Moved X to Screening.".
- Accessibility: every submit button was `disabled` while its action ran, and disabling the focused button drops focus to the top of the page; a saved edit panel, a deleted note or contact, or a refused form that is remounted to refill it did the same. `SubmitButton` now uses `aria-disabled` and ignores presses while pending (a delayed server got one request for three presses), the add/edit application, question, import, sign-in and AI rewrite buttons use it, and `FocusKeeper` (`src/app/(app)/focus-keeper.tsx`) puts focus back on the same button when its form shows an error, else on the heading of the section the form was in, else on `<main>`.
- Accessibility: the sign-in page had no `<main>` landmark; the "Response rate by source" table scrolls sideways on phones but could not be reached with the keyboard (now a focusable, named region).

### Added

- The smoke test scans every page with axe-core (dev dependency `axe-core`) in light, dark and 390px width with data on it, plus the sign-in page, and fails on any violation; it also checks the board's kept focus and announcement, the kept focus after a refused note and after a saved edit, and that `/tailor` no longer contains job descriptions.

### Checked, nothing to change

- Dead code and dependencies: every export, CSS class and dependency is used (one internal constant, `REWRITE_SYSTEM`, is no longer exported). SEO: the app is private and already sends `noindex, nofollow`; nothing to add.

### Notes for the next agent

- Not fixed: a 2,000-card board still has about 28,000 DOM nodes (mostly the seven `<option>`s of each card's stage menu). It loads in about 0.2 s now; virtualising the columns would be the next step if someone tracks far more.
- `FocusKeeper` reacts only when focus has fallen to `<body>` within 30 s of a form submit; it never moves focus away from an element the user is on. New forms that sit in a `<section>` with an `<h2>` get this for free.
- New pending buttons: use `SubmitButton`, never `disabled={pending}`.
- The scratchpad shared by agents on this machine is not private: another agent overwrote a measurement script in it mid-round. Use a subfolder of your own.
- Still open from earlier rounds: AI rewrite tested only with a mocked client; delete and "Mark done" show the in-app error page when offline (roadmap); no calendar subscription feed and no live calendar-app import test; the social preview needs a manual upload; private vulnerability reporting is off; no manual theme switch; no `script-src` CSP; 4 dev-only drizzle-kit advisories (axe-core adds none).

Earlier, feature round: calendar export. Using the demo board, the "Up next" reminders only existed inside offerlog, so a phone screen due tomorrow was easy to miss unless the app was open; calendar export was the top item on the roadmap that needs no new data.

### Added

- **Calendar export (.ics)**: **Download next steps (.ics)** on Import & export, and **Add to calendar** next to an application's next step (`/api/export?format=ics`, optionally `&id=<application>`; same session check and `no-store` as the other exports; 400 for a malformed id, 404 when that application has no open dated next step). Each open next step with a due date becomes an all-day event (`DTSTART`/`DTEND` as dates, so no time-zone shifts) with a 9:00 display reminder, the role and stage as its description, the posting link as `URL`, and `TRANSP:TRANSPARENT` so it does not block the day. Rejected and ghosted applications are left out, as on the board's Up next strip. UIDs are stable per application (`offerlog-application-<id>-next-step`), so calendars that match by UID update an event on re-import. Written by `nextStepsIcs` in `src/lib/ics.ts` (RFC 5545 escaping, CRLF, folding at 75 octets without splitting a UTF-8 character).
- Tests: `src/lib/ics.test.ts` (event fields, filtering, empty calendar, month/year/leap-day ends, escaping that cannot add properties or events, folding of multi-byte text); the smoke test clicks **Add to calendar** and reads the downloaded file. The demo export and a file with commas, semicolons, backslashes, newlines and long Japanese/French text were also parsed with the Python `icalendar` library: every field round-tripped exactly.

### Fixed

- Security: a link containing a newline or tab, such as `https://x.example/a<newline>BEGIN:VEVENT`, passed validation because the URL parser silently drops those characters, and was stored as typed. In a calendar file it would have added lines of its own. `safeUrl` (`src/lib/validate.ts`) now refuses control characters, and the calendar writes the parser's one-line `href` in any case, for rows saved earlier.

### Changed

- README: calendar export under Features; the roadmap item is now a calendar subscription URL that stays in sync; the comparison no longer says there is no calendar integration at all. Screenshots of the application page (light and dark) and Import & export regenerated.

### Notes for the next agent

- Not built: a subscription feed. Calendar apps cannot send the session cookie, so it would need a secret per-feed token in the URL (and a way to rotate it), and Google Calendar cannot reach a server bound to `127.0.0.1` anyway. Re-importing a file does not remove events for steps marked done.
- Not checked: importing the file into Google Calendar, Apple Calendar or Outlook themselves (no accounts here); the format was checked with a parser only.
- The Codex review of this round could not run (usage limit); the control-character link bug above was found by hand while reviewing the URL line.
- Still open from earlier rounds: the AI rewrite is only tested with a mocked client, delete/"Mark done" buttons show the in-app error page when offline (roadmap), the social preview image needs a manual upload, private vulnerability reporting is off, no manual theme switch, no `script-src` CSP, 4 dev-only drizzle-kit advisories.

Earlier, launch round: making the repository presentable and honest for a first visitor. The README quickstart was followed literally on a fresh clone from GitHub (clone, `npm ci --ignore-scripts`, hash a password, build, start, sign in, load demo data, open every page): it works as written.

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
