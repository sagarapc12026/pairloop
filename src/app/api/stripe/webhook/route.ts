import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function syncSubscription(sub: Stripe.Subscription) {
  const spaceId = sub.metadata?.spaceId;
  if (!spaceId) return;
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const end = (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  await db.space.update({
    where: { id: spaceId },
    data: {
      plan: active ? "PREMIUM" : "FREE",
      premiumUntil: end ? new Date(end * 1000) : null,
      stripeSubId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    },
  });
}

export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "not configured" }, { status: 501 });
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object;
    if (cs.subscription) {
      const sub = await s.subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id);
      await syncSubscription(sub);
    }
  } else if (event.type.startsWith("customer.subscription.")) {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }
  return NextResponse.json({ received: true });
}
