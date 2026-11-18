#!/usr/bin/env node
// Runs the Prisma CLI with database URLs resolved from whichever variables your host provides.
// Vercel/Neon integrations name them differently (DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL,
// DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING...), so we normalise them here.
import { spawnSync } from "node:child_process";

const env = { ...process.env };
const first = (...keys) => keys.map((k) => env[k]).find((v) => v && v.trim());

const pooled = first("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
if (pooled) env.DATABASE_URL = pooled;

let direct = first("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DIRECT_URL", "POSTGRES_URL_NO_SSL");
if (!direct && pooled) {
  // Neon pooled hosts look like ep-xxx-pooler.region.aws.neon.tech; the direct host drops "-pooler".
  direct = pooled.replace(/-pooler(\.[^/]*neon\.tech)/, "$1");
}
if (direct) env.DATABASE_URL_UNPOOLED = direct;

const args = process.argv.slice(2);
const needsDb = args[0] === "migrate" || args[0] === "db";
if (args[0] === "migrate" && args[1] === "deploy" && !env.DATABASE_URL) {
  // Allow deploying the site before a database is connected. Sign-in won't work until one is added.
  console.warn("\n⚠ No database connected yet: skipping migrations. Add DATABASE_URL later and redeploy.\n");
  process.exit(0);
}
if (needsDb && !env.DATABASE_URL) {
  console.error(
    "\n✖ No database URL found.\n  Add DATABASE_URL in Vercel → Settings → Environment Variables\n  (or connect a Postgres database under Storage), then redeploy.\n",
  );
  process.exit(1);
}
// `prisma generate` only needs the variables to exist, not to be real.
env.DATABASE_URL ??= "postgresql://placeholder:placeholder@localhost:5432/placeholder";
env.DATABASE_URL_UNPOOLED ??= env.DATABASE_URL;

const r = spawnSync("npx", ["prisma", ...args], { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(r.status ?? 1);
