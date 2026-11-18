"use client";
import { useMemo, useState } from "react";
import { addDays, format, isAfter, isSameDay, startOfDay, subDays } from "date-fns";
import { AlertTriangle, Flame } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { TaskRow } from "@/components/TaskRow";
import { useTasks, useWishes } from "@/lib/client";
import { firstName, tone } from "@/lib/people";
import { isOverdue } from "@/lib/dates";
import type { Member, Task } from "@/lib/types";

export default function Dashboard() {
  const { members } = useApp();
  const { tasks } = useTasks();
  const { wishes } = useWishes();
  const all = useMemo(() => tasks ?? [], [tasks]);

  const s = useMemo(() => {
    const open = all.filter((t) => !t.completedAt);
    const done = all.filter((t) => t.completedAt);
    const weekAgo = subDays(new Date(), 7);
    return {
      total: all.length,
      open: open.length,
      done: done.length,
      doneWeek: done.filter((t) => isAfter(new Date(t.completedAt!), weekAgo)).length,
      high: open.filter((t) => t.priority === "HIGH").length,
      overdue: open.filter((t) => isOverdue(t.dueAt, t.hasTime)).length,
      rate: all.length ? Math.round((done.length / all.length) * 100) : 0,
      upcoming: open.filter((t) => t.dueAt && !isOverdue(t.dueAt, t.hasTime)).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)).slice(0, 5),
    };
  }, [all]);

  const wishOpen = (wishes ?? []).filter((w) => !w.completedAt).length;
  const wishDone = (wishes ?? []).filter((w) => w.completedAt).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-2 sm:px-6 md:pt-10">
      <h1 className="px-1 text-[30px] font-semibold">Dashboard</h1>
      <p className="px-1 text-[15px] text-ink-2">How the two of you are doing.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={s.total} label="Total tasks" sub={`${s.rate}% complete`} />
        <Stat value={s.done} label="Completed" sub={`${s.doneWeek} this week`} />
        <Stat value={s.high} label="Priority open" icon={s.high ? <Flame size={16} className="text-urgent" /> : null} />
        <Stat value={s.overdue} label="Overdue" icon={s.overdue ? <AlertTriangle size={16} className="text-urgent" /> : null} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card title="Finished in the last 14 days">
          <DoneChart tasks={all} members={members} />
        </Card>
        <Card title="Who's carrying what">
          <Split tasks={all} members={members} />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card title="Coming up">
          {s.upcoming.length ? <ul className="-mx-3 -mb-2">{s.upcoming.map((t) => <TaskRow key={t.id} task={t} />)}</ul> : <p className="text-[14px] text-muted">Nothing scheduled. Add a date to a task to see it here.</p>}
        </Card>
        <Card title="Wishlist">
          <div className="flex gap-8">
            <div><p className="font-display text-[34px] leading-none font-semibold tabular">{wishOpen}</p><p className="mt-1 text-[13px] text-muted">Still wished for</p></div>
            <div><p className="font-display text-[34px] leading-none font-semibold tabular">{wishDone}</p><p className="mt-1 text-[13px] text-muted">Came true</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ value, label, sub, icon }: { value: number; label: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-surface p-4 shadow-[var(--shadow-lift)]">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">{icon}{label}</p>
      <p className="mt-2 font-display text-[36px] leading-none font-semibold tabular">{value}</p>
      {sub ? <p className="mt-1.5 text-[13px] text-muted">{sub}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] bg-surface p-5 shadow-[var(--shadow-lift)]">
      <h2 className="mb-4 font-sans text-[15px] font-semibold tracking-normal">{title}</h2>
      {children}
    </section>
  );
}

function Legend({ members }: { members: Member[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-4 text-[13px] text-ink-2">
      {members.map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone(m.color).fg }} /> {firstName(m.name)}
        </span>
      ))}
    </div>
  );
}

/** Stacked bars: tasks completed per day, by who completed them. */
function DoneChart({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const start = startOfDay(subDays(new Date(), 13));
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(start, i);
      const done = tasks.filter((t) => t.completedAt && isSameDay(new Date(t.completedAt), d));
      return { d, counts: members.map((m) => done.filter((t) => t.completedById === m.id).length), total: done.length };
    });
  }, [tasks, members]);
  const max = Math.max(3, ...days.map((d) => d.total));
  const W = 560, H = 160, padB = 22, padT = 6, gap = 2;
  const bw = W / days.length;
  const barW = Math.min(22, bw - 8);
  const y = (v: number) => ((H - padB - padT) * v) / max;

  return (
    <div className="relative">
      {members.length > 1 ? <Legend members={members} /> : null}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Tasks completed per day over the last 14 days">
        {[0, Math.ceil(max / 2), max].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={H - padB - y(v)} y2={H - padB - y(v)} stroke="var(--line)" strokeWidth={1} strokeDasharray={v ? "2 4" : undefined} />
          </g>
        ))}
        {days.map((day, i) => {
          const x = i * bw + (bw - barW) / 2;
          let acc = 0;
          const segs = members.map((m, j) => {
            const v = day.counts[j];
            if (!v) return null;
            const h = y(v) - (acc > 0 ? gap : 0);
            const top = H - padB - y(acc) - y(v);
            acc += v;
            const isTop = acc === day.total;
            return (
              <path
                key={m.id}
                d={isTop ? roundedTop(x, top, barW, h, 4) : `M${x},${top} h${barW} v${h} h${-barW} Z`}
                fill={tone(m.color).fg}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
            );
          });
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${format(day.d, "EEE MMM d")}: ${day.total} done`}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {segs}
              {i % 2 === 1 || i === days.length - 1 ? (
                <text x={i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">{format(day.d, i === days.length - 1 ? "'Today'" : "d")}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-8 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-lift)]"
          style={{ left: `clamp(0px, calc(${((hover + 0.5) / days.length) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}
        >
          <p className="font-semibold">{format(days[hover].d, "EEE, MMM d")}</p>
          {members.map((m, j) => (
            <p key={m.id} className="flex items-center gap-1.5 text-ink-2">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: tone(m.color).fg }} /> {firstName(m.name)} <span className="ml-auto tabular">{days[hover].counts[j]}</span>
            </p>
          ))}
        </div>
      ) : null}
      <table className="sr-only">
        <caption>Tasks completed per day</caption>
        <thead><tr><th>Day</th>{members.map((m) => <th key={m.id}>{m.name}</th>)}</tr></thead>
        <tbody>{days.map((d) => <tr key={d.d.toISOString()}><td>{format(d.d, "MMM d")}</td>{d.counts.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Open vs done per person, plus one shared split bar of completions. */
function Split({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  const rows = members.map((m) => ({
    m,
    open: tasks.filter((t) => !t.completedAt && t.assigneeId === m.id).length,
    done: tasks.filter((t) => t.completedById === m.id).length,
  }));
  const shared = tasks.filter((t) => !t.completedAt && !t.assigneeId).length;
  const totalDone = rows.reduce((a, r) => a + r.done, 0);
  return (
    <div>
      {totalDone > 0 && members.length > 1 ? (
        <>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={rows.map((r) => `${r.m.name} ${r.done} done`).join(", ")}>
            {rows.filter((r) => r.done).map((r) => (
              <div key={r.m.id} title={`${r.m.name}: ${r.done} done`} style={{ flex: r.done, background: tone(r.m.color).fg }} />
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-muted">Share of finished tasks</p>
        </>
      ) : null}
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.m.id} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: tone(r.m.color).fg }} />
            <span className="flex-1 text-[15px] font-medium">{firstName(r.m.name)}</span>
            <span className="text-[13px] text-ink-2 tabular">{r.open} open</span>
            <span className="w-16 text-right text-[13px] text-ink-2 tabular">{r.done} done</span>
          </li>
        ))}
        {members.length > 1 ? (
          <li className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-line" />
            <span className="flex-1 text-[15px] font-medium">Either of you</span>
            <span className="text-[13px] text-ink-2 tabular">{shared} open</span>
            <span className="w-16" />
          </li>
        ) : null}
      </ul>
    </div>
  );
}
