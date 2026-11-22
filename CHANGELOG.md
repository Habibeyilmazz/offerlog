# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
