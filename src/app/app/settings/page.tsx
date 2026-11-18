"use client";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Bell, BellOff, LogOut, Smartphone } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { InviteActions } from "@/components/InviteCard";
import { startCheckout } from "@/components/Paywall";
import { Avatar, Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/client";
import { PALETTE, firstName } from "@/lib/people";
import { currentSubscription, disablePush, enablePush, isIOSNotInstalled, pushSupported } from "@/lib/push";

export default function Settings() {
  const { data, openPaywall } = useApp();
  const { me, partner, space } = data;
  const [name, setName] = useState(me.name);
  const [loopName, setLoopName] = useState(space.name);
  const [push, setPush] = useState<"on" | "off" | "unsupported" | "blocked" | "ios">("off");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("upgraded")) {
      toast.success("Welcome to Premium. Unlimited tasks unlocked.");
      mutate("/api/me");
    }
    (async () => {
      if (isIOSNotInstalled()) return setPush("ios");
      if (!pushSupported()) return setPush("unsupported");
      if (Notification.permission === "denied") return setPush("blocked");
      setPush((await currentSubscription()) && Notification.permission === "granted" ? "on" : "off");
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile");
    try {
      await api("/api/me", { method: "PATCH", body: { name, loopName } });
      await mutate("/api/me");
      toast.success("Saved");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  }

  async function setColor(color: string) {
    await api("/api/me", { method: "PATCH", body: { color } }).catch(() => {});
    mutate("/api/me");
  }

  async function togglePush() {
    setBusy("push");
    if (push === "on") { await disablePush(); setPush("off"); toast.success("Notifications off on this device"); }
    else {
      const r = await enablePush();
      if (r === "granted") { setPush("on"); toast.success("Notifications on for this device"); }
      else if (r === "denied") { setPush("blocked"); }
      else toast.error("Couldn't turn on notifications on this device.");
    }
    setBusy(null);
  }

  const used = Math.min(space.tasksCreated, space.freeLimit);

  return (
    <div className="mx-auto max-w-xl px-4 pt-2 sm:px-6 md:pt-10">
      <h1 className="px-1 text-[30px] font-semibold">Settings</h1>

      <Section title="Your loop">
        <div className="flex items-center gap-3">
          <span className="flex -space-x-2"><Avatar name={me.name} color={me.color} size={44} ring />{partner ? <Avatar name={partner.name} color={partner.color} size={44} ring /> : null}</span>
          <p className="text-[14px] text-ink-2">{partner ? <>You and <b className="text-ink">{firstName(partner.name)}</b> share this loop.</> : "Your partner hasn't joined yet."}</p>
        </div>
        {!partner ? (
          <div className="mt-4">
            <p className="mb-2 text-[14px] font-semibold">Invite link</p>
            <InviteActions code={space.inviteCode} inviter={me.name} />
          </div>
        ) : null}
      </Section>

      <Section title="Notifications">
        <div className="flex items-start gap-3">
          {push === "on" ? <Bell size={20} className="mt-0.5 text-ok" /> : <BellOff size={20} className="mt-0.5 text-muted" />}
          <div className="flex-1">
            <p className="font-medium">{push === "on" ? "On for this device" : "Push notifications"}</p>
            <p className="text-[13px] text-muted">
              {push === "ios" ? "On iPhone, tap Share then “Add to Home Screen”, open Pairloop from there, and turn this on."
                : push === "blocked" ? "Notifications are blocked for this site. Allow them in your browser settings, then come back."
                : push === "unsupported" ? "This browser can't receive push notifications. You'll still see updates inside the app."
                : "Get told when tasks are handed to you or finished, and get priority reminders 15, 10 and 5 minutes before."}
            </p>
          </div>
          {push === "on" || push === "off" ? (
            <Button size="sm" variant={push === "on" ? "soft" : "primary"} loading={busy === "push"} onClick={togglePush}>{push === "on" ? "Turn off" : "Turn on"}</Button>
          ) : push === "ios" ? <Smartphone size={20} className="text-muted" /> : null}
        </div>
      </Section>

      <Section title="Plan">
        {space.premium ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-display text-[20px] font-semibold">Premium</p>
              <p className="text-[13px] text-muted">Unlimited tasks for both of you{space.premiumUntil ? `. Renews ${new Date(space.premiumUntil).toLocaleDateString()}` : ""}.</p>
            </div>
            {space.hasBilling ? (
              <Button size="sm" variant="soft" loading={busy === "portal"} onClick={async () => {
                setBusy("portal");
                try { const { url } = await api<{ url: string }>("/api/billing/portal", { body: {} }); location.href = url; } catch (e) { toast.error((e as Error).message); setBusy(null); }
              }}>Manage</Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="font-display text-[20px] font-semibold">Free</p>
              <p className="text-[13px] text-ink-2 tabular">{used} of {space.freeLimit} tasks used</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={space.freeLimit} aria-label="Free tasks used">
              <div className="h-full rounded-full" style={{ width: `${(used / space.freeLimit) * 100}%`, background: used >= space.freeLimit ? "var(--urgent)" : "var(--ink)" }} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <p className="flex-1 text-[13px] text-muted">Premium is $19.99 a year for both of you, with unlimited tasks.</p>
              <Button size="sm" loading={busy === "checkout"} onClick={async () => { setBusy("checkout"); try { await startCheckout(); } catch (e) { toast.error((e as Error).message); setBusy(null); } }}>Go Premium</Button>
            </div>
            <button onClick={() => openPaywall()} className="mt-2 text-[13px] font-semibold text-ink-2 underline-offset-2 hover:underline">What&apos;s included</button>
          </>
        )}
      </Section>

      <Section title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Your name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Loop name"><input className={inputCls} value={loopName} onChange={(e) => setLoopName(e.target.value)} /></Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Your color</span>
            <div className="flex gap-2">
              {(["lagoon", "orchid"] as const).map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} aria-pressed={me.color === c}
                  className="flex h-10 items-center gap-2 rounded-full border-2 px-3 text-[14px] font-semibold"
                  style={{ borderColor: me.color === c ? PALETTE[c].fg : "var(--line)", color: PALETTE[c].fg }}>
                  <span className="h-4 w-4 rounded-full" style={{ background: PALETTE[c].fg }} /> {PALETTE[c].label}
                </button>
              ))}
            </div>
            {partner ? <p className="mt-1.5 text-[12px] text-muted">{firstName(partner.name)} gets the other color.</p> : null}
          </div>
          <Button type="submit" variant="soft" loading={busy === "profile"}>Save profile</Button>
        </form>
        <p className="mt-4 text-[13px] text-muted">Signed in as {me.email}</p>
      </Section>

      <div className="mt-6 mb-4 px-1">
        <Button variant="danger" onClick={async () => { await api("/api/auth/logout", { body: {} }); location.href = "/"; }}><LogOut size={16} /> Sign out</Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-[22px] bg-surface p-5 shadow-[var(--shadow-lift)]">
      <h2 className="mb-3 font-sans text-[15px] font-semibold tracking-normal text-ink-2">{title}</h2>
      {children}
    </section>
  );
}
