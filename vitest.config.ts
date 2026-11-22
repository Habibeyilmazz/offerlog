import { defineConfig } from "vitest/config";

export default defineConfig({
  // Far from UTC on purpose, so code that mixes UTC and local dates fails here, not for users.
  test: { include: ["src/**/*.test.ts"], env: { TZ: "Pacific/Auckland" } },
});
