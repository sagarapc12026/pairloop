"use client";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button, Field, inputCls } from "@/components/ui";
import { api, DEMO } from "@/lib/client";
import { startDemo } from "@/lib/demo";
import { DemoNote } from "@/components/DemoNote";

export default function Login() {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (DEMO) { startDemo(); location.href = "/app"; return; }
    try {
      await api("/api/auth/login", { body: f });
      const next = new URLSearchParams(location.search).get("next");
      location.href = next && next.startsWith("/app") ? next : "/app";
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" foot={<>New here? <Link className="font-semibold text-ink underline-offset-2 hover:underline" href="/signup">Start a loop</Link></>}>
      {DEMO ? (
        <>
          <DemoNote>Demo mode: sign in with any details, or skip them. Nothing is sent to a server; everything stays in this browser.</DemoNote>
          <Button size="lg" className="mb-6 w-full" onClick={() => { startDemo(); location.href = "/app"; }}>Explore the demo</Button>
        </>
      ) : null}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input required={!DEMO} autoFocus={!DEMO} type="email" autoComplete="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><input required={!DEMO} type="password" autoComplete="current-password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err ? <p role="alert" className="text-[14px] font-medium text-urgent">{err}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
      </form>
    </AuthCard>
  );
}
