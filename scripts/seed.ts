// Replaces the database contents with fictional demo data: node scripts/seed.ts
import { db } from "../src/db/index.ts";
import { seedDemo } from "../src/lib/seed.ts";

seedDemo(db());
console.log(`Seeded demo data into ${process.env.OFFERLOG_DB ?? "data/offerlog.db"}`);
