"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { TaskMeta } from "./TaskChips";
import { useApp } from "./AppContext";
import { patchTask } from "@/lib/client";
import { memberById, tone } from "@/lib/people";
import type { Task } from "@/lib/types";

export function TaskRow({ task }: { task: Task }) {
  const { members, openTask, data } = useApp();
  const assignee = memberById(members, task.assigneeId);
  const done = !!task.completedAt;
  const [justDone, setJustDone] = useState(false);
  const ringColor = task.priority === "HIGH" && !done ? "var(--urgent)" : assignee ? tone(assignee.color).fg : "var(--muted)";

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setJustDone(!done);
    try {
      await patchTask(task.id, { completed: !done });
      if (!done) toast.success("Done. Your partner's been told.", { duration: 2000 });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <li
      className="group flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2"
      onClick={() => openTask(task.id)}
    >
      <button
        onClick={toggle}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors", justDone && done && "anim-pop")}
        style={done ? { background: ringColor, borderColor: ringColor } : { borderColor: ringColor }}
      >
        {done ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={clsx("text-[15.5px] leading-snug font-medium break-words", done && "text-muted line-through decoration-1")}>{task.title}</p>
        {!done || task.dueAt ? (
          <div className="mt-1.5">
            <TaskMeta dueAt={task.dueAt} hasTime={task.hasTime} priority={task.priority} isPrivate={task.isPrivate} assignee={assignee} both={!task.assigneeId} done={done} meId={data.me.id} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
