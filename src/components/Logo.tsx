export function LogoMark({ size = 28, a = "var(--lagoon)", b = "var(--orchid)" }: { size?: number; a?: string; b?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="16" r="8" fill="none" stroke={a} strokeWidth="3.2" />
      <circle cx="20" cy="16" r="8" fill="none" stroke={b} strokeWidth="3.2" />
      {/* re-draw the top arc of the first ring so the loops interlock */}
      <path d="M 12 8 A 8 8 0 0 1 18.93 12" fill="none" stroke={a} strokeWidth="3.2" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-display text-[1.25em] font-semibold tracking-tight">pairloop</span>
    </span>
  );
}
