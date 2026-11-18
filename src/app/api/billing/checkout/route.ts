import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { stripe, appUrl } from "@/lib/stripe";
import { isPremium } from "@/lib/plan";

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const s = stripe();
  if (!s) throw new HttpError(501, "Payments aren't set up yet. Add STRIPE_SECRET_KEY to enable Premium.");
  if (isPremium(me.space)) throw new HttpError(409, "Your loop is already Premium.");
  const base = appUrl(req);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: me.space.stripeCustomerId ?? undefined,
    customer_email: me.space.stripeCustomerId ? undefined : me.email,
    client_reference_id: me.spaceId,
    metadata: { spaceId: me.spaceId },
    subscription_data: { metadata: { spaceId: me.spaceId } },
    line_items: [
      process.env.STRIPE_PRICE_ID
        ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 1999,
              recurring: { interval: "year" },
              product_data: { name: "Pairloop Premium", description: "Unlimited tasks for both of you" },
            },
          },
    ],
    allow_promotion_codes: true,
    success_url: `${base}/app/settings?upgraded=1`,
    cancel_url: `${base}/app/settings`,
  });
  return NextResponse.json({ url: session.url });
});
