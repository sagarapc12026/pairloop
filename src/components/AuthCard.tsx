import Link from "next/link";
import { Logo } from "./Logo";

export function AuthCard({ title, sub, children, foot }: { title: string; sub?: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-10 pb-10 sm:justify-center sm:pt-0">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-sm">
        <h1 className="text-[30px] leading-tight font-semibold">{title}</h1>
        {sub ? <p className="mt-2 text-ink-2">{sub}</p> : null}
        <div className="mt-7">{children}</div>
        {foot ? <div className="mt-6 text-center text-[14px] text-muted">{foot}</div> : null}
      </div>
    </main>
  );
}
