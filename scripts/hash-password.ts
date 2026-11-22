// Prints an OFFERLOG_PASSWORD_HASH line. Reads the password from stdin so it never lands in shell history.
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../src/lib/password.ts";

const rl = createInterface({ input: process.stdin, output: process.stderr });
const password = (await rl.question("Password (min 8 characters): ")).trim();
rl.close();
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
console.log(`OFFERLOG_PASSWORD_HASH=${hashPassword(password)}`);
