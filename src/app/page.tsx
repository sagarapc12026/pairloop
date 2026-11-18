"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BellRing, CalendarDays, Gift, Lock, Mic, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TaskMeta } from "@/components/TaskChips";
import { parseTask } from "@/lib/parse";

const DEMO_PARTNER = { id: "p", name: "Sam", color: "orchid", isOwner: false };
const EXAMPLES = [
  "Pick up kids today at 3pm urgent",
  "Sam book the restaurant for Friday 7pm",
  "Buy a birthday gift for mom private",
  "We need to renew passports next month",
];

export default function Landing() {
  const [text, setText] = useState(EXAMPLES[0]);
  const parsed = useMemo(() => parseTask(text, { partnerName: "Sam" }), [text]);

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/login" className="rounded-full px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-surface-2">Sign in</Link>
          <Link href="/signup" className="rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-bg">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 pt-14 pb-16 sm:px-8 md:grid-cols-[1.05fr_1fr] md:items-center md:pt-20">
        <div>
          <h1 className="text-[44px] leading-[1.02] font-semibold sm:text-[60px]">
            One list for<br />the two of you.
          </h1>
          <p className="mt-5 max-w-md text-[17px] text-ink-2">
            Hand each other tasks, see what&apos;s done, and get nudged until the important things happen.
            Type it the way you&apos;d text it, or just say it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-semibold text-bg">
              Start your loop
            </Link>
            <span className="text-[13px] text-muted">Free for your first 10 tasks. One sign-up, then share a link.</span>
          </div>
        </div>

        {/* The live demo: type anything and watch it become a task. */}
        <div className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-6">
          <label htmlFor="demo" className="text-[13px] font-semibold text-muted">Try it, type a task</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-bg px-4">
            <input
              id="demo"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-13 flex-1 bg-transparent text-[16px] outline-none"
              placeholder="Pick up kids today at 3pm urgent"
            />
            <Mic size={18} className="text-muted" aria-hidden />
          </div>
          <div className="mt-4 rounded-2xl border border-line p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2"
                style={{ borderColor: parsed.priority === "HIGH" ? "var(--urgent)" : parsed.who === "partner" ? "var(--orchid)" : "var(--lagoon)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">{parsed.title || "…"}</p>
                <div className="mt-2">
                  <TaskMeta
                    dueAt={parsed.dueAt?.toISOString() ?? null}
                    hasTime={parsed.hasTime}
                    priority={parsed.priority}
                    isPrivate={parsed.isPrivate}
                    assignee={parsed.who === "partner" ? DEMO_PARTNER : parsed.who === "me" ? { id: "m", name: "You", color: "lagoon", isOwner: true } : null}
                    meId="m"
                    both={parsed.who === "both"}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => setText(e)} className="rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-line">
                {e}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-x-10 gap-y-9 px-5 py-14 sm:grid-cols-2 sm:px-8">
          {[
            { icon: <Sparkles size={20} />, t: "Shared by default, private when you want", d: "Every task is visible to both of you unless you lock it. Assign to yourself, your partner, or both." },
            { icon: <BellRing size={20} />, t: "Reminders that don't let go", d: "Mark something as priority and both phones get nudged 15, 10 and 5 minutes before, then keep nudging until it's done or someone turns it off." },
            { icon: <CalendarDays size={20} />, t: "A calendar that fills itself", d: "Any task with a date lands on your shared calendar. The dashboard shows what's done and what's slipping." },
            { icon: <Gift size={20} />, t: "Wishlists you can grant", d: "Shopping, travel, date nights. Add a wish, and your partner can quietly make it happen." },
          ].map((f) => (
            <div key={f.t} className="flex gap-4">
              <span className="mt-0.5 text-ink">{f.icon}</span>
              <div>
                <h3 className="text-[17px] font-semibold">{f.t}</h3>
                <p className="mt-1 text-[15px] text-ink-2">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <h2 className="text-3xl font-semibold">Simple pricing</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-line p-6">
            <p className="font-display text-xl font-semibold">Free</p>
            <p className="mt-1 text-ink-2">Both partners, all features, your first 10 tasks.</p>
          </div>
          <div className="rounded-[24px] bg-ink p-6 text-bg">
            <p className="font-display text-xl font-semibold">Premium <span className="font-sans text-base font-medium opacity-70">$19.99 a year</span></p>
            <p className="mt-1 opacity-80">Unlimited tasks for both of you. One subscription covers the pair.</p>
          </div>
        </div>
        <p className="mt-10 flex items-center gap-2 text-[13px] text-muted"><Lock size={14} /> Private tasks are only ever visible to the person who made them.</p>
      </section>
    </main>
  );
}
