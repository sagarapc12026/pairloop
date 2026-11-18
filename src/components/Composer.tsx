"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { CalendarDays, Clock, Flame, Lock, Mic, Square, StickyNote, X } from "lucide-react";
import clsx from "clsx";
import { Button, Segmented, Sheet } from "./ui";
import { useApp, type ComposerPrefill } from "./AppContext";
import { parseTask, type Who } from "@/lib/parse";
import { api, ApiError } from "@/lib/client";
import { useSpeech } from "@/lib/speech";
import { firstName, tone } from "@/lib/people";
import { fromInputs, toDateInput, toTimeInput, dueLabel } from "@/lib/dates";
import type { Task } from "@/lib/types";

type Overrides = { date?: string; time?: string; who?: Who; high?: boolean; priv?: boolean };

const PLACEHOLDERS = ["Pick up kids today at 3pm urgent", "Sam call the plumber tomorrow", "Book date night Friday 7pm", "Pay rent on the 1st"];

export function Composer({ open, prefill, onClose }: { open: boolean; prefill: ComposerPrefill | null; onClose: () => void }) {
  const { data, openPaywall } = useApp();
  const partner = data.partner;
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [ov, setOv] = useState<Overrides>({});
  const [heard, setHeard] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useMemo(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)], [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const speech = useSpeech((t) => {
    setText((cur) => (cur ? `${cur} ${t}` : t));
    setHeard(true);
  });

  // Reset each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setText(prefill?.text ?? "");
    setNotes("");
    setShowNotes(false);
    setHeard(false);
    setOv(prefill?.date ? { date: toDateInput(prefill.date) } : {});
    if (prefill?.listen) setTimeout(() => speech.start(), 150);
    else setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parseTask(text, { partnerName: partner?.name }), [text, partner?.name]);

  // Effective values = what the parser found, unless the person adjusted them by hand.
  const date = ov.date ?? (parsed.dueAt ? toDateInput(parsed.dueAt) : "");
  const time = ov.time ?? (parsed.dueAt && parsed.hasTime ? toTimeInput(parsed.dueAt) : "");
  const isPrivate = ov.priv ?? parsed.isPrivate;
  const high = ov.high ?? parsed.priority === "HIGH";
  let who: Who = ov.who ?? parsed.who ?? "me";
  if (!partner || isPrivate) who = "me";
  const due = date ? fromInputs(date, time || null) : null;

  async function save() {
    if (!parsed.title.trim() || !text.trim()) {
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const assigneeId = who === "me" ? data.me.id : who === "partner" ? partner?.id ?? null : null;
      const { task } = await api<{ task: Task }>("/api/tasks", {
        body: {
          title: parsed.title,
          notes: notes.trim() || null,
          dueAt: due ? due.toISOString() : null,
          hasTime: !!time,
          priority: high ? "HIGH" : "NORMAL",
          isPrivate,
          assigneeId,
        },
      });
      mutate("/api/tasks", (cur?: { tasks: Task[] }) => ({ tasks: [task, ...(cur?.tasks ?? [])] }), { revalidate: true });
      mutate("/api/me");
      toast.success(who === "partner" && partner ? `Sent to ${firstName(partner.name)}` : "Task added");
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === "LIMIT") {
        onClose();
        openPaywall("limit");
      } else toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const whoOptions = [
    { value: "me" as Who, label: "Me", activeStyle: { color: tone(data.me.color).fg } },
    ...(partner
      ? [
          { value: "partner" as Who, label: firstName(partner.name), activeStyle: { color: tone(partner.color).fg } },
          { value: "both" as Who, label: "Both of us" },
        ]
      : []),
  ];

  return (
    <Sheet
      open={open}
      onClose={() => { speech.stop(); onClose(); }}
      title={heard ? "Check it and save" : "New task"}
      footer={
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[12px] text-muted">
            {!data.space.premium ? `${Math.max(0, data.space.freeLimit - data.space.tasksCreated)} free tasks left` : "Premium"}
          </span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!text.trim()} variant={high ? "urgent" : "primary"}>
            {who === "partner" && partner ? `Send to ${firstName(partner.name)}` : "Save task"}
          </Button>
        </div>
      }
    >
      <div className="relative">
        <textarea
          ref={inputRef}
          rows={2}
          value={speech.listening ? speech.interim || text : text}
          readOnly={speech.listening}
          onChange={(e) => { setText(e.target.value); setHeard(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          }}
          placeholder={speech.listening ? "Listening…" : placeholder}
          aria-label="Task"
          className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3.5 pr-14 font-display text-[19px] leading-snug font-medium outline-none placeholder:font-sans placeholder:text-[16px] placeholder:font-normal placeholder:text-muted focus:border-ink"
        />
        <button
          type="button"
          onClick={() => (speech.listening ? speech.stop() : speech.start())}
          aria-label={speech.listening ? "Stop listening" : "Say a task"}
          className={clsx(
            "absolute top-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full transition",
            speech.listening ? "anim-pulse bg-urgent text-white" : "bg-surface-2 text-ink hover:bg-line",
          )}
        >
          {speech.listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
        </button>
      </div>
      {speech.error ? <p className="mt-2 text-[13px] text-urgent">{speech.error}</p> : null}
      {heard && !speech.listening ? <p className="mt-2 text-[13px] text-ink-2">Here&apos;s what we heard. Fix anything that&apos;s off, then save.</p> : null}

      {text.trim() ? (
        <p className="mt-3 text-[13px] text-muted">
          Saving as <b className="text-ink">{parsed.title}</b>
          {due ? <> on <b className="text-ink">{dueLabel(due.toISOString(), !!time)}</b></> : null}
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-muted">Write it like a text: who, what, when. Add “urgent” for priority or “private” to keep it to yourself.</p>
      )}

      <div className="mt-5 space-y-4">
        {partner ? (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Who&apos;s doing it</p>
            <Segmented value={who} onChange={(v) => setOv({ ...ov, who: v, priv: v !== "me" ? false : ov.priv })} options={whoOptions} />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-3">
            <CalendarDays size={16} className="shrink-0 text-muted" />
            <input type="date" aria-label="Date" value={date} onChange={(e) => setOv({ ...ov, date: e.target.value })} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          </label>
          <label className={clsx("flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-3", !date && "opacity-50")}>
            <Clock size={16} className="shrink-0 text-muted" />
            <input type="time" aria-label="Time" disabled={!date} value={time} onChange={(e) => setOv({ ...ov, time: e.target.value })} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
            {time ? <button type="button" aria-label="Clear time" onClick={() => setOv({ ...ov, time: "" })}><X size={14} className="text-muted" /></button> : null}
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={high}
            onClick={() => setOv({ ...ov, high: !high })}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors"
            style={high ? { background: "var(--urgent)", color: "white", borderColor: "var(--urgent)" } : { borderColor: "var(--line)", color: "var(--ink-2)" }}
          >
            <Flame size={15} /> Priority
          </button>
          <button
            type="button"
            aria-pressed={isPrivate}
            onClick={() => setOv({ ...ov, priv: !isPrivate })}
            className={clsx("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors", isPrivate ? "border-ink bg-ink text-bg" : "border-line text-ink-2")}
          >
            <Lock size={15} /> Private
          </button>
          {!showNotes ? (
            <button type="button" onClick={() => setShowNotes(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-semibold text-ink-2">
              <StickyNote size={15} /> Note
            </button>
          ) : null}
        </div>
        {high ? (
          <p className="rounded-2xl bg-urgent-soft px-4 py-3 text-[13px] text-ink">
            {time
              ? <>Reminders go to {isPrivate || !partner ? "you" : "both of you"} 15, 10 and 5 minutes before, then keep coming until it&apos;s done.</>
              : <>Add a time so we can send reminders 15, 10 and 5 minutes before.</>}
          </p>
        ) : null}
        {isPrivate ? <p className="text-[13px] text-muted">Only you will see this task.</p> : null}
        {showNotes ? (
          <textarea autoFocus rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details, addresses, links…" className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-[15px] outline-none focus:border-ink" />
        ) : null}
      </div>
    </Sheet>
  );
}
