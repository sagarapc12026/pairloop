"use client";
/**
 * In-browser stand-in for the API, used when no database is connected.
 * Mirrors the server rules (visibility, notifications, wishlist permissions,
 * free limit, reminder schedule). Everything is kept in localStorage only.
 */
import { ApiError } from "./errors";
import type { AppNotification, Member, Task, Wish, WishCategory } from "./types";

const KEY = "pairloop-demo-v1";
export const DEMO_COOKIE = "pl_demo";
const LIMIT = 10;

type User = Member & { email: string };
type State = {
  users: [User, User];
  viewAs: 0 | 1;
  space: { name: string; premium: boolean; tasksCreated: number };
  tasks: Task[];
  wishes: Wish[];
  notes: (AppNotification & { userId: string })[];
  reminders: Record<string, string[]>;
};

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const iso = (d: Date) => d.toISOString();
const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
const dayOnly = (days: number) => at(days, 0, 0);

function seed(myName = "Alex", partnerName = "Sam"): State {
  const a: User = { id: "u-a", name: myName, color: "lagoon", isOwner: true, email: "you@demo.pairloop" };
  const b: User = { id: "u-b", name: partnerName, color: "orchid", isOwner: false, email: "partner@demo.pairloop" };
  const now = Date.now();
  const soon = new Date(now + 40 * 60000); soon.setSeconds(0, 0);
  const t = (p: Partial<Task> & { title: string; createdById: string }): Task => ({
    id: uid(), notes: null, dueAt: null, hasTime: false, priority: "NORMAL", isPrivate: false, remindersEnabled: true,
    assigneeId: null, completedAt: null, completedById: null, createdAt: iso(new Date(now - 864e5 * 2)), ...p,
  });
  const tasks = [
    t({ title: "Pick up kids from school", createdById: a.id, assigneeId: b.id, priority: "HIGH", dueAt: iso(soon), hasTime: true }),
    t({ title: "Book dentist appointment", createdById: a.id, assigneeId: a.id, dueAt: iso(dayOnly(1)) }),
    t({ title: "Renew car insurance", createdById: b.id, dueAt: iso(dayOnly(3)), notes: "Compare at least two quotes" }),
    t({ title: "Buy anniversary gift", createdById: a.id, assigneeId: a.id, isPrivate: true, dueAt: iso(dayOnly(6)) }),
    t({ title: "Plan weekend trip", createdById: b.id }),
    t({ title: "Dinner reservation for Friday", createdById: b.id, assigneeId: a.id, dueAt: iso(at(2, 19)), hasTime: true }),
    t({ title: "Pay electricity bill", createdById: a.id, assigneeId: b.id, completedAt: iso(new Date(now - 864e5)), completedById: b.id, dueAt: iso(dayOnly(-1)) }),
    t({ title: "Grocery run", createdById: b.id, completedAt: iso(new Date(now - 3 * 3600e3)), completedById: a.id }),
  ];
  const w = (p: Partial<Wish> & { title: string; category: WishCategory; createdById: string }): Wish => ({
    id: uid(), notes: null, link: null, fulfillerId: null, fulfillingAt: null, completedAt: null, createdAt: iso(new Date(now - 864e5 * 3)), ...p,
  });
  const wishes = [
    w({ title: "Weekend in Lisbon", category: "TRAVEL", createdById: b.id, notes: "Spring, before it gets hot" }),
    w({ title: "Green rain jacket", category: "SHOPPING", createdById: a.id, notes: "Size M", fulfillerId: b.id, fulfillingAt: iso(new Date(now - 864e5)) }),
    w({ title: "Sushi omakase night", category: "DATE_NIGHT", createdById: b.id }),
    w({ title: "Standing desk", category: "HOME", createdById: a.id, completedAt: iso(new Date(now - 864e5 * 5)) }),
  ];
  const n = (userId: string, kind: string, title: string, mins: number, extra: Partial<AppNotification> = {}) => ({
    id: uid(), userId, kind, title, body: null, taskId: null, wishId: null, urgent: false, read: false, createdAt: iso(new Date(now - mins * 60000)), ...extra,
  });
  return {
    users: [a, b], viewAs: 0,
    // Sample tasks only partly count toward the free limit so there is room to try things.
    space: { name: `${myName} & ${partnerName}`, premium: false, tasksCreated: 3 },
    tasks, wishes,
    notes: [
      n(a.id, "task_done", `✓ ${partnerName} finished: Pay electricity bill`, 60 * 20, { taskId: tasks[6].id }),
      n(a.id, "wish_new", `${partnerName} added a wish: Weekend in Lisbon`, 60 * 30, { wishId: wishes[0].id }),
      n(a.id, "task_new", `${partnerName} asked you: Dinner reservation for Friday`, 90, { taskId: tasks[5].id }),
      n(b.id, "task_new", `${myName} asked you: Pick up kids from school`, 5, { taskId: tasks[0].id, urgent: true }),
    ],
    reminders: {},
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch { /* fall through */ }
  const s = seed();
  save(s);
  return s;
}
function save(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: in-memory only */ }
}

export function startDemo(myName?: string, partnerName?: string) {
  const fresh = myName || partnerName || !(() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  if (fresh) save(seed(myName?.trim() || "Alex", partnerName?.trim() || "Sam"));
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
}
export function endDemo() {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
export function demoViewAs(): { me: string; partner: string } {
  const s = load();
  return { me: s.users[s.viewAs].name, partner: s.users[1 - s.viewAs].name };
}
export function switchDemoView() {
  const s = load();
  s.viewAs = s.viewAs === 0 ? 1 : 0;
  save(s);
}

const visible = (s: State, me: string) => s.tasks.filter((t) => !t.isPrivate || t.createdById === me);
const member = (u: User): Member => ({ id: u.id, name: u.name, color: u.color, isOwner: u.isOwner });

function notify(s: State, userIds: string[], kind: string, title: string, extra: Partial<AppNotification> = {}) {
  for (const userId of new Set(userIds)) {
    s.notes.unshift({ id: uid(), userId, kind, title, body: null, taskId: null, wishId: null, urgent: false, read: false, createdAt: iso(new Date()), ...extra });
  }
  s.notes = s.notes.slice(0, 200);
}

const STAGES = [
  { key: "m15", offset: -15 }, { key: "m10", offset: -10 }, { key: "m5", offset: -5 }, { key: "due", offset: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ key: `o${(i + 1) * 10}`, offset: (i + 1) * 10 })),
];
function tick(s: State) {
  const now = Date.now();
  for (const t of s.tasks) {
    if (t.priority !== "HIGH" || t.completedAt || !t.remindersEnabled || !t.dueAt || !t.hasTime) continue;
    const due = new Date(t.dueAt).getTime();
    const done = new Set(s.reminders[t.id] ?? []);
    const pending = STAGES.filter((st) => due + st.offset * 60000 <= now && !done.has(st.key));
    if (!pending.length) continue;
    s.reminders[t.id] = [...done, ...pending.map((p) => p.key)];
    const off = Math.round((now - due) / 60000);
    const when = off < 0 ? `In ${-off} min` : off === 0 ? "Due now" : `Overdue by ${off} min`;
    const assignee = s.users.find((u) => u.id === t.assigneeId);
    const recipients = t.isPrivate ? [t.createdById] : s.users.map((u) => u.id);
    for (const r of recipients) {
      notify(s, [r], "reminder", `${off > 0 ? "Still open" : "Priority"}: ${t.title}`, {
        taskId: t.id, urgent: true,
        body: !assignee ? `${when}. Either of you can take it.` : assignee.id === r ? `${when}. You're on it.` : `${when}. ${assignee.name} is on it.`,
      });
    }
  }
}

type Body = Record<string, unknown>;

/** Handles the same routes as the real API. */
export async function demoApi<T>(url: string, method: string, body: Body = {}): Promise<T> {
  const s = load();
  const meU = s.users[s.viewAs];
  const other = s.users[1 - s.viewAs];
  const me = meU.id;
  const path = url.split("?")[0];
  const seg = path.split("/").filter(Boolean); // ["api", "tasks", id?]
  const out = (v: unknown) => { save(s); return v as T; };
  const fail = (status: number, msg: string, code?: string): never => { throw new ApiError(msg, status, code); };

  // --- me ---
  if (path === "/api/me" && method === "GET") {
    return out({
      me: { ...member(meU), email: meU.email },
      partner: member(other),
      space: { id: "demo", name: s.space.name, inviteCode: "demo", premium: s.space.premium, premiumUntil: null, tasksCreated: s.space.tasksCreated, freeLimit: LIMIT, hasBilling: false },
      unread: s.notes.filter((n) => n.userId === me && !n.read).length,
    });
  }
  if (path === "/api/me" && method === "PATCH") {
    if (typeof body.name === "string" && body.name.trim()) meU.name = body.name.trim();
    if (typeof body.loopName === "string" && body.loopName.trim()) s.space.name = body.loopName.trim();
    if (body.color === "lagoon" || body.color === "orchid") { meU.color = body.color; other.color = body.color === "lagoon" ? "orchid" : "lagoon"; }
    return out({ ok: true });
  }

  // --- tasks ---
  if (seg[1] === "tasks") {
    const id = seg[2];
    if (!id && method === "GET") return out({ tasks: visible(s, me).sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9")) });
    if (!id && method === "POST") {
      if (!s.space.premium && s.space.tasksCreated >= LIMIT) fail(402, `You've used all ${LIMIT} free tasks. Go Premium for unlimited tasks.`, "LIMIT");
      const isPrivate = !!body.isPrivate;
      let assigneeId = (body.assigneeId as string | null) ?? null;
      if (assigneeId && !s.users.some((u) => u.id === assigneeId)) assigneeId = null;
      if (isPrivate) assigneeId = me;
      const task: Task = {
        id: uid(), title: String(body.title || "").trim() || "Untitled", notes: (body.notes as string) || null,
        dueAt: (body.dueAt as string) || null, hasTime: !!body.dueAt && !!body.hasTime,
        priority: body.priority === "HIGH" ? "HIGH" : "NORMAL", isPrivate, remindersEnabled: true,
        createdById: me, assigneeId, completedAt: null, completedById: null, createdAt: iso(new Date()),
      };
      s.tasks.unshift(task);
      s.space.tasksCreated++;
      if (!isPrivate && (assigneeId !== me || task.priority === "HIGH")) {
        notify(s, [other.id], "task_new",
          assigneeId === other.id ? `${meU.name} asked you: ${task.title}` : !assigneeId ? `${meU.name} added for both of you: ${task.title}` : `${meU.name} added: ${task.title}`,
          { taskId: task.id, urgent: task.priority === "HIGH", body: task.priority === "HIGH" ? "High priority. Reminders are on." : null });
      }
      tick(s);
      return out({ task });
    }
    const t = visible(s, me).find((x) => x.id === id) ?? fail(404, "That task doesn't exist anymore.");
    if (method === "DELETE") {
      if (t.createdById !== me) fail(403, "Only the person who created this task can delete it.");
      s.tasks = s.tasks.filter((x) => x.id !== id);
      return out({ ok: true });
    }
    if (method === "PATCH") {
      if (body.isPrivate !== undefined && body.isPrivate !== t.isPrivate && t.createdById !== me) fail(403, "Only the person who created this task can change its privacy.");
      const before = { ...t };
      if (typeof body.title === "string") t.title = body.title;
      if (body.notes !== undefined) t.notes = (body.notes as string) || null;
      if (body.dueAt !== undefined) { t.dueAt = (body.dueAt as string) || null; if (!t.dueAt) t.hasTime = false; }
      if (body.hasTime !== undefined && t.dueAt) t.hasTime = !!body.hasTime;
      if (body.priority === "HIGH" || body.priority === "NORMAL") t.priority = body.priority;
      if (body.isPrivate !== undefined) t.isPrivate = !!body.isPrivate;
      if (body.assigneeId !== undefined) t.assigneeId = (body.assigneeId as string | null) ?? null;
      if (t.isPrivate) t.assigneeId = t.createdById;
      if (body.remindersEnabled !== undefined) t.remindersEnabled = !!body.remindersEnabled;
      const dueChanged = before.dueAt !== t.dueAt;
      if (dueChanged) { t.remindersEnabled = body.remindersEnabled === undefined ? true : t.remindersEnabled; delete s.reminders[t.id]; }
      if (body.completed === true && !t.completedAt) { t.completedAt = iso(new Date()); t.completedById = me; }
      if (body.completed === false && t.completedAt) { t.completedAt = null; t.completedById = null; delete s.reminders[t.id]; }
      if (!t.isPrivate) {
        if (body.completed === true && !before.completedAt) notify(s, [other.id], "task_done", `✓ ${meU.name} finished: ${t.title}`, { taskId: t.id });
        else if (body.remindersEnabled === false && before.remindersEnabled && t.priority === "HIGH") notify(s, [other.id], "reminders_off", `${meU.name} turned off reminders`, { taskId: t.id, body: t.title });
        else if (t.assigneeId === other.id && before.assigneeId !== other.id) notify(s, [other.id], "task_assigned", `${meU.name} handed you: ${t.title}`, { taskId: t.id, urgent: t.priority === "HIGH" });
      }
      return out({ task: t });
    }
  }

  // --- wishes ---
  if (seg[1] === "wishes") {
    const id = seg[2];
    if (!id && method === "GET") return out({ wishes: [...s.wishes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    if (!id && method === "POST") {
      const wish: Wish = {
        id: uid(), title: String(body.title || "").trim() || "Untitled", notes: (body.notes as string) || null, link: (body.link as string) || null,
        category: (body.category as WishCategory) || "OTHER", createdById: me, fulfillerId: null, fulfillingAt: null, completedAt: null, createdAt: iso(new Date()),
      };
      s.wishes.unshift(wish);
      notify(s, [other.id], "wish_new", `${meU.name} added a wish: ${wish.title}`, { wishId: wish.id });
      return out({ wish });
    }
    const w = s.wishes.find((x) => x.id === id) ?? fail(404, "That wish doesn't exist anymore.");
    const mine = w.createdById === me;
    if (method === "DELETE") {
      if (!mine) fail(403, "Only the person who made this wish can remove it.");
      s.wishes = s.wishes.filter((x) => x.id !== id);
      return out({ ok: true });
    }
    if (method === "PATCH") {
      const action = body.action;
      if (action === "fulfill") {
        w.fulfillerId = me; w.fulfillingAt = iso(new Date());
        if (!mine) notify(s, [w.createdById], "wish_fulfill", `${meU.name} is making it happen: ${w.title}`, { wishId: w.id });
      } else if (action === "unfulfill") {
        if (w.fulfillerId !== me) fail(403, "Only the person making it happen can step back.");
        w.fulfillerId = null; w.fulfillingAt = null;
      } else {
        if (!mine) fail(403, "Only the person who made this wish can change it or mark it done.");
        if (action === "complete") { w.completedAt = iso(new Date()); notify(s, [other.id], "wish_done", `Wish come true: ${w.title}`, { wishId: w.id }); }
        if (action === "reopen") w.completedAt = null;
      }
      return out({ wish: w });
    }
  }

  // --- notifications ---
  if (path === "/api/notifications" && method === "GET") {
    return out({ notifications: s.notes.filter((n) => n.userId === me).slice(0, 60).map((n) => { const c: Partial<typeof n> = { ...n }; delete c.userId; return c; }) });
  }
  if (path === "/api/notifications" && method === "POST") {
    const ids = body.ids as string[] | undefined;
    s.notes.forEach((n) => { if (n.userId === me && (!ids || ids.includes(n.id))) n.read = true; });
    return out({ ok: true });
  }

  // --- the rest ---
  if (path === "/api/reminders/tick") { tick(s); return out({ ok: true }); }
  if (path === "/api/push") return out({ ok: true });
  if (path === "/api/billing/checkout") { s.space.premium = true; return out({ url: "/app/settings?upgraded=1" }); }
  if (path === "/api/billing/portal") fail(400, "Billing isn't available in the demo.");
  if (path === "/api/auth/logout") { endDemo(); return { ok: true } as T; }
  return fail(404, "Not available in the demo.");
}
