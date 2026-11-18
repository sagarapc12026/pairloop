import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { wishDTO } from "@/lib/dto";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  action: z.enum(["fulfill", "unfulfill", "complete", "reopen", "edit"]),
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  link: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
  category: z.enum(["SHOPPING", "TRAVEL", "DATE_NIGHT", "HOME", "OTHER"]).optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const w = await db.wish.findFirst({ where: { id, spaceId: me.spaceId } });
  if (!w) throw new HttpError(404, "That wish doesn't exist anymore.");
  const b = Patch.parse(await req.json());
  const isCreator = w.createdById === me.id;
  const others = (await db.user.findMany({ where: { spaceId: me.spaceId, NOT: { id: me.id } } })).map((o) => o.id);

  let data = {};
  switch (b.action) {
    case "fulfill":
      data = { fulfillerId: me.id, fulfillingAt: new Date() };
      break;
    case "unfulfill":
      if (w.fulfillerId !== me.id) throw new HttpError(403, "Only the person making it happen can step back.");
      data = { fulfillerId: null, fulfillingAt: null };
      break;
    case "complete":
    case "reopen":
    case "edit":
      if (!isCreator) throw new HttpError(403, "Only the person who made this wish can change it or mark it done.");
      data =
        b.action === "complete"
          ? { completedAt: new Date() }
          : b.action === "reopen"
            ? { completedAt: null }
            : { title: b.title, notes: b.notes === undefined ? undefined : b.notes || null, link: b.link === undefined ? undefined : b.link || null, category: b.category };
  }
  const updated = await db.wish.update({ where: { id: w.id }, data });
  if (b.action === "fulfill" && !isCreator) {
    await notify({ userIds: [w.createdById], spaceId: me.spaceId, kind: "wish_fulfill", title: `${me.name} is making it happen: ${w.title}`, wishId: w.id });
  }
  if (b.action === "complete") {
    await notify({ userIds: others, spaceId: me.spaceId, kind: "wish_done", title: `Wish come true: ${w.title}`, wishId: w.id });
  }
  return NextResponse.json({ wish: wishDTO(updated) });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const w = await db.wish.findFirst({ where: { id, spaceId: me.spaceId } });
  if (!w) throw new HttpError(404, "That wish doesn't exist anymore.");
  if (w.createdById !== me.id) throw new HttpError(403, "Only the person who made this wish can remove it.");
  await db.wish.delete({ where: { id: w.id } });
  return NextResponse.json({ ok: true });
});
