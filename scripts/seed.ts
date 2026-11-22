// Fills an empty database with fictional demo data: node scripts/seed.ts (--force replaces existing data).
import { db } from "../src/db/index.ts";
import { isEmptyTracker, seedDemo } from "../src/lib/seed.ts";

// The default database is the one `npm start` uses, so never wipe a real search by accident.
if (!isEmptyTracker(db()) && !process.argv.includes("--force")) {
  console.error(`${process.env.OFFERLOG_DB ?? "data/offerlog.db"} already has applications or questions. Run with --force to replace them with demo data.`);
  process.exit(1);
}
seedDemo(db());
console.log(`Seeded demo data into ${process.env.OFFERLOG_DB ?? "data/offerlog.db"}`);
