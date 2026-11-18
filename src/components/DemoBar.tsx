"use client";
import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { ArrowLeftRight, FlaskConical, RotateCcw } from "lucide-react";
import { useApp } from "./AppContext";
import { endDemo, startDemo, switchDemoView } from "@/lib/demo";
import { firstName } from "@/lib/people";

/** Shown only in demo mode: explains where data lives and lets you see the partner's side. */
export function DemoBar() {
  const { data } = useApp();
  const [busy, setBusy] = useState(false);
  const partner = data.partner;

  async function swap() {
    setBusy(true);
    switchDemoView();
    await Promise.all(["/api/me", "/api/tasks", "/api/wishes", "/api/notifications"].map((k) => mutate(k)));
    toast.success(`You're now seeing ${firstName(partner?.name)}'s view`);
    setBusy(false);
  }

  return (
    <div className="px-4 pt-2 sm:px-6 md:pt-6">
    <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-sun-soft px-4 py-2.5 text-[13px] text-ink">
      <FlaskConical size={16} className="shrink-0 text-sun" />
      <span className="min-w-0 flex-1">
        <b>Demo</b>, viewing as {firstName(data.me.name)}. Data stays in this browser.
      </span>
      {partner ? (
        <button onClick={swap} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-semibold shadow-[var(--shadow-lift)] active:scale-95">
          <ArrowLeftRight size={14} /> See {firstName(partner.name)}&apos;s view
        </button>
      ) : null}
      <button
        onClick={() => { if (confirm("Start the demo over with fresh sample data?")) { endDemo(); startDemo(); location.href = "/app"; } }}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 font-semibold text-ink-2 hover:bg-surface/60"
        aria-label="Reset demo"
      >
        <RotateCcw size={14} /> <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
    </div>
  );
}
