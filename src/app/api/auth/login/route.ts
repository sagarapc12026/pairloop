import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, startSession } from "@/lib/auth";
import { email } from "@/lib/validate";

const Body = z.object({ email, password: z.string().min(1) });

export const POST = handle(async (req: Request) => {
  const b = Body.parse(await req.json());
  const user = await db.user.findUnique({ where: { email: b.email } });
  if (!user || !(await bcrypt.compare(b.password, user.passwordHash))) {
    throw new HttpError(401, "That email and password don't match.");
  }
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});
