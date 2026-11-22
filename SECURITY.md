# Security policy

offerlog is a single-user app you host yourself. It holds personal data (applications, contacts, salary notes, your resume text), so security reports are welcome.

## Supported versions

Only the latest commit on `main` gets fixes. There are no release branches.

## Reporting a vulnerability

Please do not open a public issue with details of a vulnerability.

- If the repository's **Security** tab shows **Report a vulnerability**, use it: the report stays private.
- Otherwise, open an issue titled "Security contact request" with no details, and a private channel will be arranged.

Include what an attacker can do, the steps to reproduce against a fresh install with demo data, and the commit you tested. You will get a reply when the report is read; there is no bounty.

## Scope

In scope: anything that lets someone without the password read or change data, bypass the sign-in rate limit, run code on the server, or get user-entered text executed in the browser.

Out of scope, by design (see "How it works" in the README):

- Running the app on plain HTTP across a network. Compose binds to `127.0.0.1`; put a TLS reverse proxy in front for other devices.
- Anything that needs the password, shell access to the host, or write access to the SQLite file or `.env`.
- The four moderate `npm audit` advisories in drizzle-kit's bundled esbuild dev server. drizzle-kit is a dev dependency used only to generate migrations, and that server is never started. CI fails on any advisory in a runtime dependency.
- The missing `script-src` Content-Security-Policy. Next.js inline scripts would need per-request nonces; React escapes all user text, and the app never renders user HTML.
