import { defineConfig, devices } from "@playwright/test";
import { rmSync } from "node:fs";
import { hashPassword } from "./src/lib/password.ts";

// Throwaway test password and database for the smoke test only.
export const E2E_PASSWORD = "e2e-test-password";
const DB = "test-results/e2e.db";
const PORT = 4222;
rmSync(DB, { force: true });
rmSync(`${DB}-wal`, { force: true });
rmSync(`${DB}-shm`, { force: true });

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Requires `npm run build` first.
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    env: { OFFERLOG_DB: DB, OFFERLOG_PASSWORD_HASH: hashPassword(E2E_PASSWORD), NEXT_TELEMETRY_DISABLED: "1" },
  },
});
