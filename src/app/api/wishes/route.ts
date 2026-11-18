import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import { wishDTO } from "@/lib/dto";
import { notify } from "@/lib/notify";

export const GET = handle(async () => {
  const me = await requireUser();
  const wishes = await db.wish.findMany({ where: { spaceId: me.spaceId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ wishes: wishes.map(wishDTO) });
});

const Create = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  link: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
  category: z.enum(["SHOPPING", "TRAVEL", "DATE_NIGHT", "HOME", "OTHER"]),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const b = Create.parse(await req.json());
  const wish = await db.wish.create({
    data: { spaceId: me.spaceId, createdById: me.id, title: b.title, notes: b.notes || null, link: b.link || null, category: b.category },
  });
  const others = await db.user.findMany({ where: { spaceId: me.spaceId, NOT: { id: me.id } } });
  await notify({
    userIds: others.map((o) => o.id),
    spaceId: me.spaceId,
    kind: "wish_new",
    title: `${me.name} added a wish: ${wish.title}`,
    wishId: wish.id,
  });
  return NextResponse.json({ wish: wishDTO(wish) }, { status: 201 });
});
