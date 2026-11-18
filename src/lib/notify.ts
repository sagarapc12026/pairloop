import * as webpush from "web-push";
import { db } from "./db";

let vapidReady: boolean | null = null;
function ensureVapid() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (vapidReady = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@pairloop.app", pub, priv);
  return (vapidReady = true);
}

export type NotifyInput = {
  userIds: string[];
  spaceId: string;
  kind: string;
  title: string;
  body?: string;
  taskId?: string;
  wishId?: string;
  urgent?: boolean;
  url?: string;
};

/** Stores an in-app notification for each user and fans out Web Push. Never throws. */
export async function notify(n: NotifyInput) {
  try {
    await deliver(n);
  } catch (e) {
    console.error("notify failed", e);
  }
}

async function deliver(n: NotifyInput) {
  const userIds = [...new Set(n.userIds)];
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      spaceId: n.spaceId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      taskId: n.taskId,
      wishId: n.wishId,
      urgent: !!n.urgent,
    })),
  });
  if (!ensureVapid()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.url ?? (n.wishId ? "/app/wishlist" : "/app"),
    taskId: n.taskId,
    urgent: !!n.urgent,
    tag: n.taskId ? `task-${n.taskId}` : n.wishId ? `wish-${n.wishId}` : undefined,
  });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: n.urgent ? 600 : 3600, urgency: n.urgent ? "high" : "normal" },
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.warn("push failed", code);
        }
      }
    }),
  );
}
