import { db } from "./db";
import { notify } from "./notify";

/**
 * High-priority reminder schedule, in minutes relative to the due time.
 * Before due: 15, 10, 5 minutes. At due. Then every 10 minutes for 2 hours
 * until someone completes it or turns reminders off.
 */
const STAGES: { key: string; offset: number }[] = [
  { key: "m15", offset: -15 },
  { key: "m10", offset: -10 },
  { key: "m5", offset: -5 },
  { key: "due", offset: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ key: `o${(i + 1) * 10}`, offset: (i + 1) * 10 })),
];
const MAX_OFFSET = STAGES[STAGES.length - 1].offset;

function phrase(offset: number) {
  if (offset < 0) return `in ${-offset} min`;
  if (offset === 0) return "due now";
  return `overdue by ${offset} min`;
}

/** Sends any reminders that are due. Safe to call often and concurrently. */
export async function processReminders(spaceId?: string) {
  const now = Date.now();
  const tasks = await db.task.findMany({
    where: {
      ...(spaceId ? { spaceId } : {}),
      priority: "HIGH",
      completedAt: null,
      remindersEnabled: true,
      dueAt: {
        gte: new Date(now - (MAX_OFFSET + 5) * 60_000),
        lte: new Date(now + 16 * 60_000),
      },
    },
    include: { reminders: true, assignee: true, space: { include: { members: true } } },
  });

  let sent = 0;
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const due = t.dueAt.getTime();
    const done = new Set(t.reminders.map((r) => r.stage));
    // All stages whose time has arrived but haven't been logged yet.
    const pending = STAGES.filter((s) => due + s.offset * 60_000 <= now && !done.has(s.key));
    if (!pending.length) continue;
    // Claim every pending stage; only the newest one actually fires (no catch-up spam).
    const claimed = await db.reminderLog.createMany({
      data: pending.map((s) => ({ taskId: t.id, stage: s.key })),
      skipDuplicates: true,
    });
    if (claimed.count === 0) continue; // another worker already handled it
    // Describe the real time left (stages can be claimed late, e.g. a task created 4 min before due).
    const realOffset = Math.round((now - due) / 60_000);
    const recipients = t.isPrivate ? [t.createdById] : t.space.members.map((m) => m.id);
    const when = cap(phrase(realOffset));
    const title = `${realOffset > 0 ? "Still open" : "Priority"}: ${t.title}`;
    // Personalise per person: the assignee reads "You're on it".
    await Promise.all(
      recipients.map((uid) =>
        notify({
          userIds: [uid],
          spaceId: t.spaceId,
          kind: "reminder",
          title,
          body: !t.assignee ? `${when}. Either of you can take it.` : t.assignee.id === uid ? `${when}. You're on it.` : `${when}. ${t.assignee.name} is on it.`,
          taskId: t.id,
          urgent: true,
        }),
      ),
    );
    sent++;
  }
  return { checked: tasks.length, sent };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
