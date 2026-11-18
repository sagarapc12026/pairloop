import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, startSession } from "@/lib/auth";
import { email, name, password } from "@/lib/validate";
import { MAX_MEMBERS } from "@/lib/plan";
import { notify } from "@/lib/notify";

const Body = z.object({ code: z.string().min(4), name, email, password });

export const POST = handle(async (req: Request) => {
  const b = Body.parse(await req.json());
  const space = await db.space.findUnique({ where: { inviteCode: b.code }, include: { members: true } });
  if (!space) throw new HttpError(404, "This invite link isn't valid anymore. Ask your partner for a new one.");
  if (space.members.length >= MAX_MEMBERS) throw new HttpError(409, "This loop already has two people in it.");
  if (await db.user.findUnique({ where: { email: b.email } })) {
    throw new HttpError(409, "That email already has an account. Sign in with it instead.");
  }
  const taken = new Set(space.members.map((m) => m.color));
  const user = await db.user.create({
    data: {
      name: b.name,
      email: b.email,
      passwordHash: await bcrypt.hash(b.password, 10),
      spaceId: space.id,
      color: taken.has("orchid") ? "lagoon" : "orchid",
    },
  });
  // Rename default loop names to include both partners.
  const owner = space.members.find((m) => m.isOwner);
  if (owner && space.name === `${owner.name}'s loop`) {
    await db.space.update({ where: { id: space.id }, data: { name: `${owner.name} & ${user.name}` } });
  }
  await notify({
    userIds: space.members.map((m) => m.id),
    spaceId: space.id,
    kind: "joined",
    title: `${user.name} joined your loop`,
    body: "You can now assign tasks to each other.",
  });
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});
