import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { taskDTO } from "@/lib/dto";
import { visibleTasks } from "@/lib/tasks";
import { FREE_TASK_LIMIT, isPremium } from "@/lib/plan";
import { notify } from "@/lib/notify";
import { processReminders } from "@/lib/reminders";

export const GET = handle(async () => {
  const me = await requireUser();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120);
  const tasks = await db.task.findMany({
    where: {
      ...visibleTasks(me.id, me.spaceId),
      AND: [{ OR: [{ completedAt: null }, { completedAt: { gte: since } }] }],
    },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 1000,
  });
  return NextResponse.json({ tasks: tasks.map(taskDTO) });
});

const Create = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  hasTime: z.boolean().optional(),
  priority: z.enum(["NORMAL", "HIGH"]).optional(),
  isPrivate: z.boolean().optional(),
  assigneeId: z.string().optional().nullable(),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const b = Create.parse(await req.json());
  const members = await db.user.findMany({ where: { spaceId: me.spaceId } });
  let assigneeId = b.assigneeId ?? null;
  if (assigneeId && !members.some((m) => m.id === assigneeId)) assigneeId = null;
  if (b.isPrivate) assigneeId = me.id;

  const task = await db.$transaction(async (tx) => {
    // Atomically count against the free allowance.
    if (!isPremium(me.space)) {
      const res = await tx.space.updateMany({
        where: { id: me.spaceId, tasksCreated: { lt: FREE_TASK_LIMIT } },
        data: { tasksCreated: { increment: 1 } },
      });
      if (res.count === 0) {
        throw new HttpError(402, `You've used all ${FREE_TASK_LIMIT} free tasks. Go Premium for unlimited tasks.`, "LIMIT");
      }
    } else {
      await tx.space.update({ where: { id: me.spaceId }, data: { tasksCreated: { increment: 1 } } });
    }
    return tx.task.create({
      data: {
        spaceId: me.spaceId,
        title: b.title,
        notes: b.notes || null,
        dueAt: b.dueAt ? new Date(b.dueAt) : null,
        hasTime: !!b.dueAt && !!b.hasTime,
        priority: b.priority ?? "NORMAL",
        isPrivate: !!b.isPrivate,
        createdById: me.id,
        assigneeId,
      },
    });
  });

  if (!task.isPrivate) {
    const others = members.filter((m) => m.id !== me.id).map((m) => m.id);
    const forThem = assigneeId && assigneeId !== me.id;
    const shared = !assigneeId;
    if (forThem || shared || task.priority === "HIGH") {
      await notify({
        userIds: others,
        spaceId: me.spaceId,
        kind: "task_new",
        title: forThem
          ? `${me.name} asked you: ${task.title}`
          : shared
            ? `${me.name} added for both of you: ${task.title}`
            : `${me.name} added: ${task.title}`,
        body: task.priority === "HIGH" ? "High priority. Reminders are on." : undefined,
        taskId: task.id,
        urgent: task.priority === "HIGH",
      });
    }
  }
  if (task.priority === "HIGH") await processReminders(me.spaceId);
  return NextResponse.json({ task: taskDTO(task) }, { status: 201 });
});
