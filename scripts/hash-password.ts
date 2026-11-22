// Prints an OFFERLOG_PASSWORD_HASH=... line on stdout, so `node scripts/hash-password.ts >> .env.local` works.
// The password is read from stdin (not argv, so it stays out of shell history) without echoing it.
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../src/lib/password.ts";

let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stderr.write(chunk);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
const answer = rl.question("Password (min 8 characters): ");
muted = true;
const password = await answer;
rl.close();
process.stderr.write("\n");

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
console.log(`OFFERLOG_PASSWORD_HASH=${hashPassword(password)}`);
console.error("Done. Keep the password somewhere safe: it cannot be recovered from the hash.");
