import { NextResponse } from "next/server";
import { processReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Call every minute from Vercel Cron (Pro) or any external scheduler (e.g. cron-job.org).
// Auth: "Authorization: Bearer <CRON_SECRET>" or "?secret=<CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await processReminders();
  return NextResponse.json(result);
}
