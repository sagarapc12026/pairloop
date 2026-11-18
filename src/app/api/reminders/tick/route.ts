import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/auth";
import { processReminders } from "@/lib/reminders";

// Heartbeat from any open app window: keeps reminders flowing even without a cron job.
export const POST = handle(async () => {
  const me = await requireUser();
  return NextResponse.json(await processReminders(me.spaceId));
});
