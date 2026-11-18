"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button, Sheet } from "./ui";
import { api } from "@/lib/client";
import { LogoMark } from "./Logo";

export async function startCheckout() {
  const { url } = await api<{ url: string }>("/api/billing/checkout", { body: {} });
  location.href = url;
}

export function Paywall({ open, reason, onClose, used, limit }: { open: boolean; reason?: string; onClose: () => void; used: number; limit: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-4 text-center">
        <div className="flex justify-center"><LogoMark size={48} /></div>
        <h2 className="mt-4 text-[26px] leading-tight font-semibold">
          {reason === "limit" ? `You've used all ${limit} free tasks` : "Pairloop Premium"}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-ink-2">
          {reason === "limit" ? "Nice work, you two. Go Premium to keep adding tasks." : `You've created ${used} of ${limit} free tasks.`}
        </p>
      </div>
      <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-[15px]">
        {["Unlimited tasks for both of you", "Priority reminders that keep nudging", "Shared calendar, dashboard and wishlists", "One subscription covers the pair"].map((x) => (
          <li key={x} className="flex items-center gap-2.5"><Check size={18} className="shrink-0 text-ok" /> {x}</li>
        ))}
      </ul>
      <div className="mt-7 rounded-2xl bg-surface-2 p-4 text-center">
        <p className="font-display text-3xl font-semibold tabular">$19.99<span className="font-sans text-base font-medium text-muted"> / year</span></p>
        <p className="text-[13px] text-muted">That&apos;s about $1.67 a month for both of you.</p>
      </div>
      <Button
        size="lg"
        className="mt-4 w-full"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try { await startCheckout(); } catch (e) { toast.error((e as Error).message); setBusy(false); }
        }}
      >
        Go Premium
      </Button>
      <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>Not now</Button>
    </Sheet>
  );
}
