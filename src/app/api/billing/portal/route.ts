import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { stripe, appUrl } from "@/lib/stripe";

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const s = stripe();
  if (!s || !me.space.stripeCustomerId) throw new HttpError(400, "There's no billing account for this loop yet.");
  const portal = await s.billingPortal.sessions.create({ customer: me.space.stripeCustomerId, return_url: `${appUrl(req)}/app/settings` });
  return NextResponse.json({ url: portal.url });
});
