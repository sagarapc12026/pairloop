"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button, Field, inputCls } from "@/components/ui";
import { api, DEMO } from "@/lib/client";
import { startDemo } from "@/lib/demo";
import { DemoNote } from "@/components/DemoNote";

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", partnerName: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (DEMO) { startDemo(f.name, f.partnerName); location.href = "/app"; return; }
    try {
      await api("/api/auth/signup", { body: f });
      router.replace("/app/welcome");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Start your loop"
      sub="Takes 20 seconds. Your partner joins with a link, no sign-up hoops."
      foot={<>Already have a loop? <Link className="font-semibold text-ink underline-offset-2 hover:underline" href="/login">Sign in</Link></>}
    >
      {DEMO ? <DemoNote>Demo mode: we&apos;ll set up a sample loop with your names. Nothing is sent to a server; everything stays in this browser.</DemoNote> : null}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name"><input required autoFocus autoComplete="given-name" className={inputCls} value={f.name} onChange={set("name")} placeholder="Alex" /></Field>
          <Field label="Partner's name"><input className={inputCls} value={f.partnerName} onChange={set("partnerName")} placeholder="Sam" /></Field>
        </div>
        <Field label="Email"><input required={!DEMO} type="email" autoComplete="email" inputMode="email" className={inputCls} value={f.email} onChange={set("email")} placeholder="you@example.com" /></Field>
        <Field label="Password" hint="At least 6 characters."><input required={!DEMO} type="password" minLength={DEMO ? undefined : 6} autoComplete="new-password" className={inputCls} value={f.password} onChange={set("password")} /></Field>
        {err ? <p role="alert" className="text-[14px] font-medium text-urgent">{err}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create our loop</Button>
      </form>
    </AuthCard>
  );
}
