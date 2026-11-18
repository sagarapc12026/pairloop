"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Bell, CalendarDays, Gift, ListChecks, PieChart, Plus, Settings } from "lucide-react";
import { Ctx, type ComposerPrefill } from "./AppContext";
import { Composer } from "./Composer";
import { TaskSheet } from "./TaskSheet";
import { NotificationsSheet } from "./NotificationsSheet";
import { Paywall } from "./Paywall";
import { UrgentAlert } from "./UrgentAlert";
import { Avatar } from "./ui";
import { Logo, LogoMark } from "./Logo";
import { api, useMe, DEMO } from "@/lib/client";
import { DemoBar } from "./DemoBar";
import { registerSW, syncPush } from "@/lib/push";
import type { Member } from "@/lib/types";

const NAV = [
  { href: "/app", label: "Tasks", icon: ListChecks },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/wishlist", label: "Wishlist", icon: Gift },
  { href: "/app/dashboard", label: "Dashboard", icon: PieChart },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, error } = useMe();
  const path = usePathname();
  const [composer, setComposer] = useState<ComposerPrefill | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);

  // Service worker + reminder heartbeat (keeps priority reminders flowing even without a cron job).
  useEffect(() => {
    if (!DEMO) registerSW()?.then(() => syncPush()).catch(() => {});
    const tick = () => document.visibilityState === "visible" && api("/api/reminders/tick", { body: {} }).catch(() => {});
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcut: "n" opens the composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setComposer({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const members = useMemo(() => [data?.me, data?.partner].filter(Boolean) as Member[], [data]);
  const openComposer = useCallback((p?: ComposerPrefill) => setComposer(p ?? {}), []);
  const openTask = useCallback((id: string) => setTaskId(id), []);
  const openPaywall = useCallback((r?: string) => setPaywall(r ?? "upsell"), []);
  const openNotifications = useCallback(() => setNotifOpen(true), []);

  if (error && !data) {
    return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-ink-2">Can&apos;t reach Pairloop right now. Check your connection and refresh.</div>;
  }
  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center"><div className="animate-pulse"><LogoMark size={44} /></div></div>;
  }

  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const unread = data.unread;

  return (
    <Ctx.Provider value={{ data, members, openComposer, openTask, openPaywall, openNotifications }}>
      <div className="min-h-dvh md:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
          <Link href="/app" className="px-2"><Logo /></Link>
          <button onClick={() => openComposer()} className="mt-7 flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-bg hover:opacity-90">
            <Plus size={18} /> New task <kbd className="ml-auto rounded-md bg-bg/15 px-1.5 text-[11px] font-medium">N</kbd>
          </button>
          <nav className="mt-6 space-y-0.5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={clsx("flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors", active(n.href) ? "bg-surface text-ink shadow-[var(--shadow-lift)]" : "text-ink-2 hover:bg-surface-2")}>
                <n.icon size={18} /> {n.label}
              </Link>
            ))}
            <button onClick={openNotifications} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink-2 hover:bg-surface-2">
              <Bell size={18} /> Updates
              {unread ? <span className="ml-auto rounded-full bg-urgent px-1.5 text-[11px] font-bold text-white tabular">{unread}</span> : null}
            </button>
          </nav>
          <div className="mt-auto">
            <Link href="/app/settings" className={clsx("flex items-center gap-3 rounded-2xl p-2.5 transition-colors", active("/app/settings") ? "bg-surface shadow-[var(--shadow-lift)]" : "hover:bg-surface-2")}>
              <span className="flex -space-x-2">
                <Avatar name={data.me.name} color={data.me.color} size={32} ring />
                {data.partner ? <Avatar name={data.partner.name} color={data.partner.color} size={32} ring /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{data.space.name}</span>
                <span className="block text-[12px] text-muted">{data.partner ? (data.space.premium ? "Premium" : "Free plan") : "Invite your partner"}</span>
              </span>
              <Settings size={16} className="text-muted" />
            </Link>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app/settings" className="flex items-center gap-2" aria-label="Settings">
            <span className="flex -space-x-2">
              <Avatar name={data.me.name} color={data.me.color} size={30} ring />
              {data.partner ? <Avatar name={data.partner.name} color={data.partner.color} size={30} ring /> : null}
            </span>
            <span className="max-w-[180px] truncate font-display text-[16px] font-semibold">{data.space.name}</span>
          </Link>
          <button onClick={openNotifications} className="relative rounded-full p-2 hover:bg-surface-2" aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}>
            <Bell size={22} />
            {unread ? <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold text-white">{unread}</span> : null}
          </button>
        </header>

        <main className="min-w-0 flex-1 pb-28 md:pb-10">{DEMO ? <DemoBar /> : null}{children}</main>

        {/* Mobile bottom nav */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Main">
          <div className="grid h-16 grid-cols-5 items-center">
            {NAV.slice(0, 2).map((n) => <TabLink key={n.href} {...n} on={active(n.href)} />)}
            <div className="flex justify-center">
              <button onClick={() => openComposer()} aria-label="New task" className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bg shadow-[var(--shadow-sheet)] active:scale-95">
                <Plus size={26} />
              </button>
            </div>
            {NAV.slice(2).map((n) => <TabLink key={n.href} {...n} on={active(n.href)} />)}
          </div>
        </nav>
      </div>

      <Composer open={!!composer} prefill={composer} onClose={() => setComposer(null)} />
      <TaskSheet id={taskId} onClose={() => setTaskId(null)} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      <Paywall open={!!paywall} reason={paywall ?? undefined} onClose={() => setPaywall(null)} used={data.space.tasksCreated} limit={data.space.freeLimit} />
      <UrgentAlert key={data.me.id} />
    </Ctx.Provider>
  );
}

function TabLink({ href, label, icon: Icon, on }: { href: string; label: string; icon: typeof Bell; on: boolean }) {
  return (
    <Link href={href} className={clsx("flex flex-col items-center gap-0.5 text-[11px] font-semibold", on ? "text-ink" : "text-muted")} aria-current={on ? "page" : undefined}>
      <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
      {label}
    </Link>
  );
}
