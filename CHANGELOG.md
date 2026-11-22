# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

First-run review: a fresh clone was set up by following the README literally, and the code was then reviewed.

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
