import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";

export const GET = handle(async () => {
  const me = await requireUser();
  const items = await db.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 60 });
  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id, kind: n.kind, title: n.title, body: n.body, taskId: n.taskId, wishId: n.wishId,
      urgent: n.urgent, read: !!n.readAt, createdAt: n.createdAt.toISOString(),
    })),
  });
});

const Mark = z.object({ ids: z.array(z.string()).optional() });
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const b = Mark.parse(await req.json().catch(() => ({})));
  await db.notification.updateMany({
    where: { userId: me.id, readAt: null, ...(b.ids ? { id: { in: b.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
