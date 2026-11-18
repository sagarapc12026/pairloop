/* Pairloop service worker: push notifications + quick actions. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data && event.data.text() }; }
  const title = data.title || "Pairloop";
  const actions = data.taskId
    ? data.urgent
      ? [{ action: "done", title: "Mark done" }, { action: "stop", title: "Stop reminders" }]
      : [{ action: "done", title: "Mark done" }]
    : [];
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: data.tag,
      renotify: !!data.urgent,
      requireInteraction: !!data.urgent,
      vibrate: data.urgent ? [200, 100, 200, 100, 400] : [80],
      data: { url: data.url || "/app", taskId: data.taskId },
      actions,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const { url, taskId } = n.data || {};
  n.close();
  if (taskId && (event.action === "done" || event.action === "stop")) {
    const body = event.action === "done" ? { completed: true } : { remindersEnabled: false };
    event.waitUntil(
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {}),
    );
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const target = url || "/app";
      for (const w of wins) {
        if ("focus" in w) { w.navigate(target).catch(() => {}); return w.focus(); }
      }
      return self.clients.openWindow(target);
    }),
  );
});
