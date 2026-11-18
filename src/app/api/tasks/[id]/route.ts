import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { taskDTO } from "@/lib/dto";
import { visibleTasks } from "@/lib/tasks";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, userId: string, spaceId: string) {
  const t = await db.task.findFirst({ where: { id, ...visibleTasks(userId, spaceId) } });
  if (!t) throw new HttpError(404, "That task doesn't exist anymore.");
  return t;
}

const Patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  hasTime: z.boolean().optional(),
  priority: z.enum(["NORMAL", "HIGH"]).optional(),
  isPrivate: z.boolean().optional(),
  assigneeId: z.string().optional().nullable(),
  remindersEnabled: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const t = await load(id, me.id, me.spaceId);
  const b = Patch.parse(await req.json());
  const members = await db.user.findMany({ where: { spaceId: me.spaceId } });
  const others = members.filter((m) => m.id !== me.id).map((m) => m.id);

  if (b.isPrivate !== undefined && b.isPrivate !== t.isPrivate && t.createdById !== me.id) {
    throw new HttpError(403, "Only the person who created this task can change its privacy.");
  }
  let assigneeId = b.assigneeId === undefined ? t.assigneeId : b.assigneeId;
  if (assigneeId && !members.some((m) => m.id === assigneeId)) assigneeId = null;
  const isPrivate = b.isPrivate ?? t.isPrivate;
  if (isPrivate) assigneeId = t.createdById;

  const dueChanged = b.dueAt !== undefined && (b.dueAt ? new Date(b.dueAt).getTime() : null) !== (t.dueAt?.getTime() ?? null);
  const completing = b.completed === true && !t.completedAt;
  const reopening = b.completed === false && !!t.completedAt;

  const updated = await db.task.update({
    where: { id: t.id },
    data: {
      title: b.title,
      notes: b.notes === undefined ? undefined : b.notes || null,
      dueAt: b.dueAt === undefined ? undefined : b.dueAt ? new Date(b.dueAt) : null,
      hasTime: b.dueAt === null ? false : b.hasTime,
      priority: b.priority,
      isPrivate,
      assigneeId,
      remindersEnabled: b.remindersEnabled ?? (dueChanged ? true : undefined),
      completedAt: completing ? new Date() : reopening ? null : undefined,
      completedById: completing ? me.id : reopening ? null : undefined,
    },
  });
  if (dueChanged || reopening) await db.reminderLog.deleteMany({ where: { taskId: t.id } });

  if (!updated.isPrivate) {
    if (completing) {
      await notify({
        userIds: others,
        spaceId: me.spaceId,
        kind: "task_done",
        title: `✓ ${me.name} finished: ${updated.title}`,
        taskId: updated.id,
      });
    } else if (b.remindersEnabled === false && t.remindersEnabled && t.priority === "HIGH") {
      await notify({
        userIds: others,
        spaceId: me.spaceId,
        kind: "reminders_off",
        title: `${me.name} turned off reminders`,
        body: updated.title,
        taskId: updated.id,
      });
    } else if (assigneeId && assigneeId !== t.assigneeId && assigneeId !== me.id) {
      await notify({
        userIds: [assigneeId],
        spaceId: me.spaceId,
        kind: "task_assigned",
        title: `${me.name} handed you: ${updated.title}`,
        taskId: updated.id,
        urgent: updated.priority === "HIGH",
      });
    }
  }
  return NextResponse.json({ task: taskDTO(updated) });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const t = await load(id, me.id, me.spaceId);
  if (t.createdById !== me.id) throw new HttpError(403, "Only the person who created this task can delete it.");
  await db.task.delete({ where: { id: t.id } });
  return NextResponse.json({ ok: true });
});
