# Contributing

Thanks for looking. offerlog is small on purpose: one user, one SQLite file, no external services except the optional Claude rewrite. Changes that keep it that way are the easiest to merge.

## Set up

Node.js 22.18 or newer.

```sh
npm ci --ignore-scripts
node scripts/hash-password.ts >> .env.local
npm run db:seed        # fictional demo data
npm run dev            # http://localhost:4220
```

## Before you open a pull request

```sh
npm run typecheck
npm test                              # vitest, runs with TZ=Pacific/Auckland
npm run build && npm run test:e2e     # Playwright smoke test on :4222 with a throwaway database
```

CI runs the same steps, plus `npm audit --omit=dev` and a Docker build.

- New logic in `src/lib/` gets a unit test. A user-facing flow gets a step in `tests/e2e/smoke.spec.ts` when it is cheap to add.
- Every server action and route calls `requireUser()` first and validates its input with the helpers in `src/lib/validate.ts`.
- Forms whose action returns `FormState` use `useFormAction` (`src/app/(app)/use-form-action.ts`) so a refused save or a dropped connection keeps what was typed.
- Colours are tokens in `src/app/globals.css`, defined for both the light and the dark block. No hex values in components.
- Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.
- Files under `src/lib` and `src/db` use relative imports with `.ts` extensions, because the scripts in `scripts/` run them with Node's type stripping.
- Prefer the platform and the existing dependencies over a new package. A new runtime dependency needs a reason in the PR.
- Update `CHANGELOG.md` under "Unreleased", and the README if behaviour changes. Describe only what exists.
- Never commit real personal data: fixtures and screenshots use the fictional demo data (`src/lib/seed.ts`).

## Screenshots and the demo GIF

From a running instance seeded with `npm run db:seed`:

```sh
node scripts/screenshots.mjs http://localhost:4220 <password> docs/screenshots
node scripts/demo.mjs http://localhost:4220 <password> docs/demo.gif   # needs ffmpeg
```

## Licence

By contributing you agree that your work is released under the MIT licence in `LICENSE`.
