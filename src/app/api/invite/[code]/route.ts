import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MAX_MEMBERS } from "@/lib/plan";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const space = await db.space.findUnique({ where: { inviteCode: code }, include: { members: true } });
  if (!space) return NextResponse.json({ error: "This invite link isn't valid anymore." }, { status: 404 });
  const owner = space.members.find((m) => m.isOwner) ?? space.members[0];
  return NextResponse.json({
    inviter: owner?.name ?? "Your partner",
    loopName: space.name,
    full: space.members.length >= MAX_MEMBERS,
  });
}
