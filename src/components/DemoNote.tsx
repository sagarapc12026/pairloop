import { FlaskConical } from "lucide-react";

export function DemoNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mb-6 flex gap-2.5 rounded-2xl bg-sun-soft px-4 py-3 text-[13.5px] text-ink">
      <FlaskConical size={17} className="mt-0.5 shrink-0 text-sun" />
      <span>{children ?? "Demo mode: nothing is sent to a server. Everything you create stays in this browser."}</span>
    </p>
  );
}
