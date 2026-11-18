"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { InviteActions } from "@/components/InviteCard";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui";
import { enablePush, pushSupported } from "@/lib/push";
import { firstName } from "@/lib/people";
import { DEMO } from "@/lib/client";
import { useEffect } from "react";

export default function Welcome() {
  const { data } = useApp();
  const [pushState, setPushState] = useState<"idle" | "on" | "no">("idle");
  useEffect(() => { if (DEMO) location.replace("/app"); }, []);
  return (
    <div className="mx-auto max-w-md px-5 pt-6 md:pt-16">
      <LogoMark size={52} />
      <h1 className="mt-5 text-[32px] leading-tight font-semibold">Your loop is ready, {firstName(data.me.name)}.</h1>
      <p className="mt-2 text-ink-2">Two quick things and you&apos;re set.</p>

      <section className="mt-8">
        <h2 className="font-sans text-[16px] font-semibold tracking-normal">1. Send your partner this link</h2>
        <p className="mt-1 mb-3 text-[14px] text-ink-2">They choose a name and password and land straight in your loop.</p>
        <InviteActions code={data.space.inviteCode} inviter={data.me.name} />
      </section>

      <section className="mt-8">
        <h2 className="font-sans text-[16px] font-semibold tracking-normal">2. Turn on notifications</h2>
        <p className="mt-1 mb-3 text-[14px] text-ink-2">So you hear when something&apos;s handed to you, and priority reminders reach your phone.</p>
        {pushState === "on" ? (
          <p className="flex items-center gap-2 font-semibold text-ok"><Check size={18} /> Notifications are on</p>
        ) : (
          <Button variant="soft" onClick={async () => setPushState((await enablePush()) === "granted" ? "on" : "no")} disabled={!pushSupported()}>
            <Bell size={16} /> Turn on notifications
          </Button>
        )}
        {pushState === "no" || (typeof window !== "undefined" && !pushSupported()) ? (
          <p className="mt-2 text-[13px] text-muted">Not available here. On iPhone, add Pairloop to your Home Screen first, then turn it on in Settings.</p>
        ) : null}
      </section>

      <Link href="/app" className="mt-10 flex h-13 items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-bg">Go to our tasks</Link>
    </div>
  );
}
