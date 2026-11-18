import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import { memberDTO, spaceDTO } from "@/lib/dto";

export const GET = handle(async () => {
  const me = await requireUser();
  const members = await db.user.findMany({ where: { spaceId: me.spaceId }, orderBy: { createdAt: "asc" } });
  const unread = await db.notification.count({ where: { userId: me.id, readAt: null } });
  return NextResponse.json({
    me: { ...memberDTO(me), email: me.email },
    partner: members.find((m) => m.id !== me.id) ? memberDTO(members.find((m) => m.id !== me.id)!) : null,
    space: spaceDTO(me.space),
    unread,
  });
});

const Patch = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.enum(["lagoon", "orchid"]).optional(),
  loopName: z.string().trim().min(1).max(60).optional(),
});

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const b = Patch.parse(await req.json());
  await db.user.update({ where: { id: me.id }, data: { name: b.name, color: b.color } });
  // Partners always wear opposite colors so they're easy to tell apart.
  if (b.color) {
    await db.user.updateMany({ where: { spaceId: me.spaceId, NOT: { id: me.id } }, data: { color: b.color === "lagoon" ? "orchid" : "lagoon" } });
  }
  if (b.loopName) await db.space.update({ where: { id: me.spaceId }, data: { name: b.loopName } });
  return NextResponse.json({ ok: true });
});
