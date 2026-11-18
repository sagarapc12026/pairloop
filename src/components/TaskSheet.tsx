"use client";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { format } from "date-fns";
import { BellOff, BellRing, CalendarDays, Clock, Flame, Lock, Trash2, X } from "lucide-react";
import { Button, Segmented, Sheet, Toggle } from "./ui";
import { useApp } from "./AppContext";
import { api, patchTask, useTasks } from "@/lib/client";
import { firstName, memberById, tone } from "@/lib/people";
import { fromInputs, toDateInput, toTimeInput } from "@/lib/dates";
import type { Task } from "@/lib/types";

type Who = "me" | "partner" | "both";

export function TaskSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { tasks } = useTasks();
  const task = tasks?.find((t) => t.id === id) ?? null;
  return <Sheet open={!!id && !!task} onClose={onClose} title="Task">{task ? <Editor key={task.id} task={task} onClose={onClose} /> : null}</Sheet>;
}

function Editor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, members } = useApp();
  const me = data.me;
  const partner = data.partner;
  const isCreator = task.createdById === me.id;
  const done = !!task.completedAt;
  const initialWho: Who = !task.assigneeId ? "both" : task.assigneeId === me.id ? "me" : "partner";

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [date, setDate] = useState(task.dueAt ? toDateInput(new Date(task.dueAt)) : "");
  const [time, setTime] = useState(task.dueAt && task.hasTime ? toTimeInput(new Date(task.dueAt)) : "");
  const [who, setWho] = useState<Who>(initialWho);
  const [high, setHigh] = useState(task.priority === "HIGH");
  const [priv, setPriv] = useState(task.isPrivate);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (priv) setWho("me"); }, [priv]);

  const origDate = task.dueAt ? toDateInput(new Date(task.dueAt)) : "";
  const origTime = task.dueAt && task.hasTime ? toTimeInput(new Date(task.dueAt)) : "";
  const dirty = title !== task.title || notes !== (task.notes ?? "") || date !== origDate || time !== origTime || who !== initialWho || high !== (task.priority === "HIGH") || priv !== task.isPrivate;

  const creator = memberById(members, task.createdById);
  const completer = memberById(members, task.completedById);

  async function run(body: Record<string, unknown>, msg?: string) {
    setBusy(true);
    try {
      await patchTask(task.id, body as Partial<Task>);
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const due = date ? fromInputs(date, time || null) : null;
    await run({
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      dueAt: due ? due.toISOString() : null,
      hasTime: !!time && !!date,
      priority: high ? "HIGH" : "NORMAL",
      ...(isCreator ? { isPrivate: priv } : {}),
      assigneeId: who === "me" ? me.id : who === "partner" ? partner?.id ?? null : null,
    }, "Saved");
    onClose();
  }

  async function remove() {
    if (!confirm("Delete this task for both of you?")) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      await mutate("/api/tasks", (cur?: { tasks: Task[] }) => ({ tasks: (cur?.tasks ?? []).filter((t) => t.id !== task.id) }), { revalidate: false });
      toast.success("Task deleted");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {high && !done && task.dueAt && task.hasTime ? (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: task.remindersEnabled ? "var(--urgent-soft)" : "var(--surface-2)" }}>
          {task.remindersEnabled ? <BellRing size={18} className="anim-ring text-urgent" /> : <BellOff size={18} className="text-muted" />}
          <p className="flex-1 text-[13px]">{task.remindersEnabled ? "Reminders are on for both of you." : "Reminders are off."}</p>
          <Button size="sm" variant={task.remindersEnabled ? "soft" : "ghost"} onClick={() => run({ remindersEnabled: !task.remindersEnabled }, task.remindersEnabled ? "Reminders off" : "Reminders on")}>
            {task.remindersEnabled ? "Turn off" : "Turn on"}
          </Button>
        </div>
      ) : null}

      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" className="w-full border-b border-line bg-transparent pb-2 font-display text-[22px] font-semibold outline-none focus:border-ink" />

      {partner ? (
        <Segmented
          value={who}
          onChange={(v) => { setWho(v); if (v !== "me") setPriv(false); }}
          options={[
            { value: "me", label: "Me", activeStyle: { color: tone(me.color).fg } },
            { value: "partner", label: firstName(partner.name), activeStyle: { color: tone(partner.color).fg } },
            { value: "both", label: "Both of us" },
          ]}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-3">
          <CalendarDays size={16} className="shrink-0 text-muted" />
          <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          {date ? <button aria-label="Clear date" onClick={() => { setDate(""); setTime(""); }}><X size={14} className="text-muted" /></button> : null}
        </label>
        <label className="flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-3">
          <Clock size={16} className="shrink-0 text-muted" />
          <input type="time" aria-label="Time" disabled={!date} value={time} onChange={(e) => setTime(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </label>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line px-4">
        <Toggle checked={high} onChange={setHigh} tint="var(--urgent)" icon={<Flame size={18} />} label="Priority" hint="Keeps reminding until it's done" />
        {isCreator ? <Toggle checked={priv} onChange={setPriv} icon={<Lock size={18} />} label="Private" hint="Only you can see it" /> : null}
      </div>

      <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note" className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-[15px] outline-none focus:border-ink" />

      <p className="text-[12px] text-muted">
        Added by {creator?.id === me.id ? "you" : firstName(creator?.name)} on {format(new Date(task.createdAt), "MMM d")}
        {done && task.completedAt ? `. Done by ${completer?.id === me.id ? "you" : firstName(completer?.name)} on ${format(new Date(task.completedAt), "MMM d, h:mm a")}.` : "."}
      </p>

      <div className="flex items-center gap-2 pt-1">
        {isCreator ? (
          <Button variant="danger" size="sm" onClick={remove} disabled={busy} aria-label="Delete task"><Trash2 size={16} /> Delete</Button>
        ) : null}
        <span className="flex-1" />
        {dirty ? (
          <Button onClick={save} loading={busy}>Save changes</Button>
        ) : (
          <Button variant={done ? "soft" : "primary"} loading={busy} onClick={async () => { await run({ completed: !done }, done ? "Reopened" : "Done. Your partner's been told."); if (!done) onClose(); }}>
            {done ? "Reopen task" : "Mark as done"}
          </Button>
        )}
      </div>
    </div>
  );
}
