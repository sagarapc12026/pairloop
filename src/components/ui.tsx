"use client";
import clsx from "clsx";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { tone, firstName } from "@/lib/people";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "danger" | "urgent";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background,transform,opacity] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 select-none",
        size === "sm" && "h-9 px-3.5 text-[13px]",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-13 px-6 text-base",
        variant === "primary" && "bg-ink text-bg hover:opacity-90",
        variant === "ghost" && "text-ink-2 hover:bg-surface-2",
        variant === "soft" && "bg-surface-2 text-ink hover:bg-line",
        variant === "danger" && "text-urgent hover:bg-urgent-soft",
        variant === "urgent" && "bg-urgent text-white hover:opacity-90",
        className,
      )}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Avatar({ name, color, size = 28, ring }: { name?: string | null; color?: string | null; size?: number; ring?: boolean }) {
  const t = tone(color);
  return (
    <span
      aria-label={name ?? undefined}
      title={name ?? undefined}
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold", ring && "ring-2 ring-surface")}
      style={{ width: size, height: size, background: t.soft, color: t.fg, fontSize: size * 0.44 }}
    >
      {firstName(name).charAt(0).toUpperCase()}
    </span>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-[#0b0e20]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className={clsx(
          "anim-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-surface shadow-[var(--shadow-sheet)] sm:rounded-[28px]",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" />
        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-1 sm:pt-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        ) : null}
        <div className="overflow-y-auto px-5 pt-2 pb-5">{children}</div>
        {footer ? <div className="pb-safe border-t border-line px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; activeStyle?: React.CSSProperties }[]; className?: string;
}) {
  return (
    <div role="radiogroup" className={clsx("flex gap-1 rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
              active ? "bg-surface text-ink shadow-[var(--shadow-lift)]" : "text-muted hover:text-ink",
            )}
            style={active ? o.activeStyle : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, icon, tint = "var(--ink)" }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; icon?: ReactNode; tint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2.5">
      {icon ? <span className="text-muted">{icon}</span> : null}
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {hint ? <span className="block text-[13px] text-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        style={checked ? { background: tint } : undefined}
      >
        <span className={clsx("absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </span>
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full h-12 rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-muted outline-none transition focus:border-ink";

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-muted">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children ? <p className="mt-1 max-w-xs text-[14px] text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
