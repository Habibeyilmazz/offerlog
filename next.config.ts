import type { NextConfig } from "next";

const config: NextConfig = {
  // The Docker image runs the standalone server; local `next start` uses the regular build.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Imports go through a server action; allow files a bit over the 5 MB the action accepts.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default config;
