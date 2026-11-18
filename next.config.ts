import type { NextConfig } from "next";

// Demo mode: when no database is configured, the app runs fully in the browser
// (data lives in localStorage only). Force it with DEMO_MODE=1, disable with DEMO_MODE=0.
const hasDb = !!(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL);
const demo = process.env.DEMO_MODE ? process.env.DEMO_MODE === "1" : !hasDb;
if (process.argv.includes("build")) console.log(`[pairloop] demo mode: ${demo ? "ON (no database configured, data stays in the browser)" : "off"}`);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_DEMO_MODE: demo ? "1" : "0" },
};

export default nextConfig;
