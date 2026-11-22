import type { NextConfig } from "next";

const config: NextConfig = {
  // The Docker image runs the standalone server; local `next start` uses the regular build.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Stop `next dev` from writing an AGENTS.md into every checkout.
  agentRules: false,
  // Imports go through a server action; allow files a bit over the 5 MB the action accepts.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    // shortcut: no script-src policy, since Next's inline scripts would need per-request nonces; React escapes all user text.
    const csp = "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default config;
