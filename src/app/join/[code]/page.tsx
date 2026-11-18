"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button, Field, inputCls } from "@/components/ui";
import { api, DEMO } from "@/lib/client";

type Invite = { inviter: string; loopName: string; full: boolean };

export default function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (DEMO) return;
    api<Invite>(`/api/invite/${code}`).then(setInvite).catch((e) => setLoadErr(e.message));
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/auth/join", { body: { ...f, code } });
      location.href = "/app?joined=1";
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (DEMO) return <AuthCard title="Invites aren't on yet" sub="This copy of Pairloop is running as a demo, so partner invites are switched off. You can still explore everything." foot={<Link href="/login" className="font-semibold text-ink">Explore the demo</Link>}>{null}</AuthCard>;
  if (loadErr) return <AuthCard title="This link doesn't work" sub={loadErr} foot={<Link href="/" className="font-semibold text-ink">Go to Pairloop</Link>}>{null}</AuthCard>;
  if (!invite) return <AuthCard title="Opening your invite…">{null}</AuthCard>;
  if (invite.full) return <AuthCard title="This loop is full" sub="It already has two people in it. Ask for a fresh invite, or start your own." foot={<Link href="/signup" className="font-semibold text-ink">Start a loop</Link>}>{null}</AuthCard>;

  return (
    <AuthCard
      title={`${invite.inviter} invited you`}
      sub={<>Join <b className="text-ink">{invite.loopName}</b> to share tasks, reminders and wishlists.</>}
      foot={<>Already have an account? <Link className="font-semibold text-ink" href="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name"><input required autoFocus autoComplete="given-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email"><input required type="email" autoComplete="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" hint="At least 6 characters."><input required type="password" minLength={6} autoComplete="new-password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err ? <p role="alert" className="text-[14px] font-medium text-urgent">{err}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Join {invite.inviter}</Button>
      </form>
    </AuthCard>
  );
}
