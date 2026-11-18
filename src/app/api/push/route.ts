import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";

const Sub = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const s = Sub.parse(await req.json());
  await db.pushSubscription.upsert({
    where: { endpoint: s.endpoint },
    update: { userId: me.id, p256dh: s.keys.p256dh, auth: s.keys.auth },
    create: { userId: me.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
  return NextResponse.json({ ok: true });
});
