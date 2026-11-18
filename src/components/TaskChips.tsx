"use client";
import { CalendarDays, Flame, Lock, Users } from "lucide-react";
import { dueLabel, isOverdue } from "@/lib/dates";
import { tone, firstName } from "@/lib/people";
import type { Member } from "@/lib/types";

export function Chip({ children, fg, bg }: { children: React.ReactNode; fg?: string; bg?: string }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-semibold whitespace-nowrap"
      style={{ color: fg ?? "var(--ink-2)", background: bg ?? "var(--surface-2)" }}
    >
      {children}
    </span>
  );
}

export function TaskMeta({ dueAt, hasTime, priority, isPrivate, assignee, both, done, meId }: {
  dueAt: string | null; hasTime: boolean; priority: "NORMAL" | "HIGH"; isPrivate: boolean;
  assignee: Member | null; both: boolean; done?: boolean; meId?: string;
}) {
  const overdue = !done && isOverdue(dueAt, hasTime);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {priority === "HIGH" && !done ? (
        <Chip fg="var(--urgent)" bg="var(--urgent-soft)"><Flame size={12} /> Priority</Chip>
      ) : null}
      {dueAt ? (
        <Chip fg={overdue ? "var(--urgent)" : undefined} bg={overdue ? "var(--urgent-soft)" : undefined}>
          <CalendarDays size={12} /> {dueLabel(dueAt, hasTime)}
        </Chip>
      ) : null}
      {assignee ? (
        <Chip fg={tone(assignee.color).fg} bg={tone(assignee.color).soft}>{assignee.id === meId ? "You" : firstName(assignee.name)}</Chip>
      ) : both ? (
        <Chip><Users size={12} /> Both</Chip>
      ) : null}
      {isPrivate ? <Chip><Lock size={12} /> Private</Chip> : null}
    </div>
  );
}
