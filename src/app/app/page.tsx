"use client";
import { useMemo, useState } from "react";
import { isToday, isBefore, startOfDay, endOfDay, format } from "date-fns";
import { ChevronDown, Lock, Mic, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { TaskRow } from "@/components/TaskRow";
import { Empty, Segmented } from "@/components/ui";
import { InviteActions } from "@/components/InviteCard";
import { useTasks } from "@/lib/client";
import { firstName, tone } from "@/lib/people";
import type { Task } from "@/lib/types";

type Filter = "all" | "mine" | "partner" | "private";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function TasksPage() {
  const { data, openComposer } = useApp();
  const { tasks } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const me = data.me, partner = data.partner;

  const filtered = useMemo(() => (tasks ?? []).filter((t) => {
    if (filter === "mine") return t.assigneeId === me.id || !t.assigneeId;
    if (filter === "partner") return !!partner && (t.assigneeId === partner.id || !t.assigneeId);
    if (filter === "private") return t.isPrivate;
    return true;
  }), [tasks, filter, me.id, partner]);

  const groups = useMemo(() => {
    const open = filtered.filter((t) => !t.completedAt);
    const today0 = startOfDay(new Date()), today1 = endOfDay(new Date());
    const g = { priority: [] as Task[], overdue: [] as Task[], today: [] as Task[], upcoming: [] as Task[], someday: [] as Task[] };
    for (const t of open) {
      const d = t.dueAt ? new Date(t.dueAt) : null;
      const overdue = d && (t.hasTime ? d.getTime() < Date.now() : isBefore(d, today0));
      if (t.priority === "HIGH" && (!d || d <= today1)) g.priority.push(t);
      else if (overdue) g.overdue.push(t);
      else if (d && isToday(d)) g.today.push(t);
      else if (d) g.upcoming.push(t);
      else g.someday.push(t);
    }
    const done = filtered.filter((t) => t.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!)).slice(0, 30);
    return { ...g, done };
  }, [filtered]);

  const todayAll = (tasks ?? []).filter((t) => t.dueAt && isToday(new Date(t.dueAt)));
  const todayDone = todayAll.filter((t) => t.completedAt).length;
  const openCount = (tasks ?? []).filter((t) => !t.completedAt).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-2 sm:px-6 md:pt-10">
      <div className="px-1">
        <p className="text-[14px] text-muted">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="mt-0.5 text-[30px] leading-tight font-semibold">{greeting()}, {firstName(me.name)}</h1>
        {tasks ? (
          <p className="mt-1 text-[15px] text-ink-2">
            {openCount === 0 ? "Nothing open. Enjoy it." : todayAll.length ? `${todayDone} of ${todayAll.length} done today, ${openCount} open in total.` : `${openCount} open task${openCount === 1 ? "" : "s"}.`}
          </p>
        ) : null}
      </div>

      {/* Quick add bar: tap to type, mic to speak. */}
      <div className="mt-5 flex items-center gap-2 rounded-[20px] bg-surface p-1.5 pl-4 shadow-[var(--shadow-lift)]">
        <button onClick={() => openComposer()} className="h-11 flex-1 text-left text-[15px] text-muted">
          <span className="sm:hidden">Type or say a task…</span>
          <span className="hidden sm:inline">Type a task, like “pick up kids at 3pm urgent”</span>
        </button>
        <button onClick={() => openComposer({ listen: true })} aria-label="Say a task" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-bg active:scale-95">
          <Mic size={19} />
        </button>
      </div>

      {!partner ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-line p-5">
          <p className="font-display text-[18px] font-semibold">Bring your partner in</p>
          <p className="mt-1 mb-4 text-[14px] text-ink-2">Send them this link. They pick a name and password and they&apos;re in your loop.</p>
          <InviteActions code={data.space.inviteCode} inviter={me.name} />
        </div>
      ) : null}

      <div className="mt-6">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "mine", label: "Mine", activeStyle: { color: tone(me.color).fg } },
            ...(partner ? [{ value: "partner" as Filter, label: firstName(partner.name), activeStyle: { color: tone(partner.color).fg } }] : []),
            { value: "private", label: <><Lock size={13} /> Private</> },
          ]}
        />
      </div>

      {!tasks ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2" />)}</div>
      ) : filtered.length === 0 ? (
        <Empty
          icon={<Sparkles size={28} />}
          title={filter === "private" ? "No private tasks" : "A clean slate"}
          action={<button onClick={() => openComposer()} className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-semibold text-bg">Add a task</button>}
        >
          {filter === "private" ? "Add “private” to a task and only you will see it." : "Add something for yourself, or hand something to your partner."}
        </Empty>
      ) : (
        <div className="mt-4 space-y-6">
          <Section title="Priority" tint="var(--urgent)" tasks={groups.priority} />
          <Section title="Overdue" tint="var(--urgent)" tasks={groups.overdue} />
          <Section title="Today" tasks={groups.today} />
          <Section title="Coming up" tasks={groups.upcoming} />
          <Section title="Anytime" tasks={groups.someday} />
          {groups.done.length ? (
            <section>
              <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1.5 px-1 text-[14px] font-semibold text-muted" aria-expanded={showDone}>
                Done <span className="tabular">({groups.done.length})</span>
                <ChevronDown size={16} className={showDone ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
              {showDone ? <ul className="mt-1 -mx-3">{groups.done.map((t) => <TaskRow key={t.id} task={t} />)}</ul> : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({ title, tasks, tint }: { title: string; tasks: Task[]; tint?: string }) {
  if (!tasks.length) return null;
  return (
    <section>
      <h2 className="flex items-baseline gap-2 px-1 font-sans text-[14px] font-semibold tracking-normal" style={{ color: tint ?? "var(--ink-2)" }}>
        {title} <span className="text-muted tabular">{tasks.length}</span>
      </h2>
      <ul className="mt-1 -mx-3">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
    </section>
  );
}
