"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { TaskRow } from "@/components/TaskRow";
import { Button, Empty } from "@/components/ui";
import { useTasks } from "@/lib/client";
import { memberById, tone } from "@/lib/people";
import type { Task } from "@/lib/types";

export default function CalendarPage() {
  const { members, openComposer } = useApp();
  const { tasks } = useTasks();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks ?? []) {
      if (!t.dueAt) continue;
      const k = format(new Date(t.dueAt), "yyyy-MM-dd");
      m.set(k, [...(m.get(k) ?? []), t]);
    }
    return m;
  }, [tasks]);
  const selTasks = (byDay.get(format(selected, "yyyy-MM-dd")) ?? []).sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) || a.dueAt!.localeCompare(b.dueAt!));

  const color = (t: Task) => (t.completedAt ? "var(--line)" : t.priority === "HIGH" ? "var(--urgent)" : (memberById(members, t.assigneeId) ? tone(memberById(members, t.assigneeId)!.color).fg : "var(--muted)"));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-2 sm:px-6 md:pt-10">
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-[30px] font-semibold">{format(month, "MMMM")} <span className="text-muted">{format(month, "yyyy")}</span></h1>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="soft" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>Today</Button>
          <button aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full p-2 hover:bg-surface-2"><ChevronLeft size={20} /></button>
          <button aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full p-2 hover:bg-surface-2"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[24px] bg-surface p-2 shadow-[var(--shadow-lift)] sm:p-3">
          <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-semibold text-muted">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const list = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
              const sel = isSameDay(d, selected);
              const open = list.filter((t) => !t.completedAt).length;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  aria-label={`${format(d, "EEEE, MMMM d")}, ${list.length} task${list.length === 1 ? "" : "s"}`}
                  aria-pressed={sel}
                  className={clsx(
                    "flex aspect-square flex-col items-center rounded-2xl p-1 text-[14px] transition-colors sm:aspect-[1/0.9] sm:items-start sm:p-2",
                    sel ? "bg-ink text-bg" : "hover:bg-surface-2",
                    !isSameMonth(d, month) && !sel && "text-muted/60",
                  )}
                >
                  <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full font-semibold tabular", isToday(d) && !sel && "bg-urgent-soft text-urgent")}>{format(d, "d")}</span>
                  {/* Phone: dots. Larger screens: title previews. */}
                  <span className="mt-auto flex gap-0.5 sm:hidden">
                    {list.slice(0, 3).map((t) => <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: color(t) }} />)}
                  </span>
                  <span className="mt-1 hidden w-full space-y-0.5 sm:block">
                    {list.slice(0, 2).map((t) => (
                      <span key={t.id} className={clsx("flex items-center gap-1 truncate text-left text-[11px] leading-tight", t.completedAt && "line-through opacity-60")}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color(t) }} />
                        <span className="truncate">{t.title}</span>
                      </span>
                    ))}
                    {list.length > 2 ? <span className="block text-left text-[11px] opacity-70">+{list.length - 2} more</span> : null}
                  </span>
                  {open && sel ? <span className="sr-only">{open} open</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[20px] font-semibold">{isToday(selected) ? "Today" : format(selected, "EEEE, MMM d")}</h2>
            <Button size="sm" variant="soft" onClick={() => openComposer({ date: selected })}><Plus size={15} /> Add</Button>
          </div>
          {selTasks.length ? (
            <ul className="mt-2 -mx-3">{selTasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
          ) : (
            <Empty title="Nothing planned">Tap Add to put something on this day.</Empty>
          )}
        </section>
      </div>
    </div>
  );
}
