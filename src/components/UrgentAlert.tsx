"use client";
import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useNotifications, patchTask } from "@/lib/client";
import { Button } from "./ui";
import type { AppNotification } from "@/lib/types";

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [880, 988, 1175][i];
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.32);
    });
  } catch { /* audio blocked until first interaction: fine */ }
}

/** In-app alarm for priority reminders that arrive while the app is open. */
export function UrgentAlert() {
  const { notifications } = useNotifications();
  const seen = useRef<Set<string> | null>(null);
  const [alert, setAlert] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!notifications) return;
    if (!seen.current) { seen.current = new Set(notifications.map((n) => n.id)); return; }
    const fresh = notifications.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    const urgent = fresh.find((n) => n.urgent && n.taskId);
    if (urgent) {
      setAlert(urgent);
      chime();
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [notifications]);

  if (!alert) return null;
  return (
    <div className="anim-sheet fixed inset-x-3 top-3 z-[60] mx-auto max-w-md rounded-[22px] bg-[#c8262d] p-4 text-white shadow-[var(--shadow-sheet)] sm:top-5" role="alert">
      <div className="flex items-start gap-3">
        <BellRing size={22} className="anim-ring mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{alert.title}</p>
          {alert.body ? <p className="text-[14px] opacity-90">{alert.body}</p> : null}
        </div>
        <button onClick={() => setAlert(null)} aria-label="Dismiss" className="-m-1 rounded-full p-1 hover:bg-white/15"><X size={18} /></button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 !bg-white !text-[#c8262d]" onClick={() => { patchTask(alert.taskId!, { completed: true }); setAlert(null); }}>Mark done</Button>
        <Button size="sm" variant="ghost" className="flex-1 !text-white hover:!bg-white/15" onClick={() => { patchTask(alert.taskId!, { remindersEnabled: false }); setAlert(null); }}>Stop reminders</Button>
      </div>
    </div>
  );
}
