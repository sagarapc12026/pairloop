import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, startSession } from "@/lib/auth";
import { inviteCode } from "@/lib/ids";
import { email, name, password } from "@/lib/validate";

const Body = z.object({ name, email, password, partnerName: z.string().trim().max(40).optional() });

export const POST = handle(async (req: Request) => {
  const b = Body.parse(await req.json());
  if (await db.user.findUnique({ where: { email: b.email } })) {
    throw new HttpError(409, "That email already has a loop. Sign in instead.");
  }
  const passwordHash = await bcrypt.hash(b.password, 10);
  const loopName = b.partnerName ? `${b.name} & ${b.partnerName}` : `${b.name}'s loop`;
  const user = await db.user.create({
    data: {
      name: b.name,
      email: b.email,
      passwordHash,
      isOwner: true,
      color: "lagoon",
      space: { create: { name: loopName, inviteCode: inviteCode() } },
    },
  });
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});
