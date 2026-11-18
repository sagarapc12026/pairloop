"use client";
import { useMemo, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import clsx from "clsx";
import { Check, ExternalLink, Gift, Heart, Home, Plane, Plus, ShoppingBag, Sparkles, Trash2, Wine } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { Avatar, Button, Empty, Field, Sheet, inputCls } from "@/components/ui";
import { api, useWishes } from "@/lib/client";
import { firstName, memberById, tone } from "@/lib/people";
import type { Wish, WishCategory } from "@/lib/types";

const CATS: { value: WishCategory; label: string; icon: typeof Gift }[] = [
  { value: "SHOPPING", label: "Shopping", icon: ShoppingBag },
  { value: "TRAVEL", label: "Travel", icon: Plane },
  { value: "DATE_NIGHT", label: "Date night", icon: Wine },
  { value: "HOME", label: "Home", icon: Home },
  { value: "OTHER", label: "Other", icon: Sparkles },
];
const catOf = (v: WishCategory) => CATS.find((c) => c.value === v) ?? CATS[4];

export default function WishlistPage() {
  const { data, members } = useApp();
  const { wishes } = useWishes();
  const [cat, setCat] = useState<WishCategory | "ALL">("ALL");
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => (wishes ?? []).filter((w) => cat === "ALL" || w.category === cat), [wishes, cat]);
  const open = list.filter((w) => !w.completedAt);
  const done = list.filter((w) => w.completedAt);

  async function act(w: Wish, action: string, msg: string) {
    try {
      await api(`/api/wishes/${w.id}`, { method: "PATCH", body: { action } });
      await mutate("/api/wishes");
      toast.success(msg);
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(w: Wish) {
    if (!confirm(`Remove “${w.title}” from the wishlist?`)) return;
    try {
      await api(`/api/wishes/${w.id}`, { method: "DELETE" });
      await mutate("/api/wishes");
      toast.success("Wish removed");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-6 md:pt-10">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold">Wishlist</h1>
          <p className="text-[15px] text-ink-2">Things you&apos;d love. Your partner can make them happen.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="mt-1 shrink-0" aria-label="Add wish"><Plus size={18} /><span className="hidden sm:inline">Add wish</span></Button>
      </div>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist">
        {[{ value: "ALL" as const, label: "All", icon: Heart }, ...CATS].map((c) => (
          <button
            key={c.value}
            role="tab"
            aria-selected={cat === c.value}
            onClick={() => setCat(c.value)}
            className={clsx("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors", cat === c.value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2 hover:bg-line")}
          >
            <c.icon size={14} /> {c.label}
          </button>
        ))}
      </div>

      {!wishes ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-[22px] bg-surface-2" />)}</div>
      ) : !open.length && !done.length ? (
        <Empty icon={<Gift size={30} />} title="No wishes yet" action={<Button onClick={() => setAdding(true)}>Add the first wish</Button>}>
          That jacket, a weekend away, a new restaurant. Add it and your partner will see it.
        </Empty>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {open.map((w) => {
              const creator = memberById(members, w.createdById);
              const fulfiller = memberById(members, w.fulfillerId);
              const mine = w.createdById === data.me.id;
              const C = catOf(w.category);
              return (
                <li key={w.id} className="flex flex-col rounded-[22px] bg-surface p-4 shadow-[var(--shadow-lift)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: tone(creator?.color).soft, color: tone(creator?.color).fg }}>
                      <C.icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] leading-snug font-semibold break-words">{w.title}</p>
                      <p className="text-[13px] text-muted">{C.label}, wished by {mine ? "you" : firstName(creator?.name)}</p>
                    </div>
                  </div>
                  {w.notes ? <p className="mt-2 text-[14px] text-ink-2">{w.notes}</p> : null}
                  {w.link ? (
                    <a href={w.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 self-start text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
                      <ExternalLink size={13} /> {new URL(w.link).hostname.replace(/^www\./, "")}
                    </a>
                  ) : null}
                  {fulfiller ? (
                    <p className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold" style={{ background: tone(fulfiller.color).soft, color: tone(fulfiller.color).fg }}>
                      <Avatar name={fulfiller.name} color={fulfiller.color} size={20} />
                      {fulfiller.id === data.me.id ? "You're making this happen" : mine ? "Someone's on it. Act surprised." : `${firstName(fulfiller.name)} is making it happen`}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                    {!fulfiller ? (
                      <Button size="sm" variant="soft" onClick={() => act(w, "fulfill", mine ? "Marked as in progress" : "Nice. It's yours to make happen.")}>
                        <Gift size={14} /> {mine ? "I'm on it" : "I'll make it happen"}
                      </Button>
                    ) : fulfiller.id === data.me.id ? (
                      <Button size="sm" variant="ghost" onClick={() => act(w, "unfulfill", "Stepped back")}>Step back</Button>
                    ) : null}
                    {mine ? (
                      <>
                        <Button size="sm" variant="soft" onClick={() => act(w, "complete", "Wish came true")}><Check size={14} /> Came true</Button>
                        <span className="flex-1" />
                        <button onClick={() => remove(w)} aria-label={`Remove ${w.title}`} className="rounded-full p-2 text-muted hover:bg-urgent-soft hover:text-urgent"><Trash2 size={16} /></button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {done.length ? (
            <section className="mt-8">
              <h2 className="px-1 font-sans text-[14px] font-semibold tracking-normal text-ink-2">Came true <span className="text-muted tabular">{done.length}</span></h2>
              <ul className="mt-2 divide-y divide-line rounded-[22px] border border-line">
                {done.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                    <Check size={16} className="shrink-0 text-ok" />
                    <span className="flex-1 text-[15px] text-ink-2">{w.title}</span>
                    {w.createdById === data.me.id ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => act(w, "reopen", "Back on the list")}>Undo</Button>
                        <button onClick={() => remove(w)} aria-label={`Remove ${w.title}`} className="rounded-full p-2 text-muted hover:text-urgent"><Trash2 size={15} /></button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <AddWish open={adding} onClose={() => setAdding(false)} defaultCat={cat === "ALL" ? "SHOPPING" : cat} />
    </div>
  );
}

function AddWish({ open, onClose, defaultCat }: { open: boolean; onClose: () => void; defaultCat: WishCategory }) {
  const [f, setF] = useState({ title: "", link: "", notes: "" });
  const [category, setCategory] = useState<WishCategory>(defaultCat);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let link = f.link.trim();
      if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
      await api("/api/wishes", { body: { ...f, link: link || null, category } });
      await mutate("/api/wishes");
      toast.success("Wish added");
      setF({ title: "", link: "", notes: "" });
      onClose();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add a wish">
      <form onSubmit={save} className="space-y-4">
        <Field label="What do you wish for?"><input required autoFocus className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Weekend in Lisbon" /></Field>
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Kind</span>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button type="button" key={c.value} onClick={() => setCategory(c.value)} aria-pressed={category === c.value}
                className={clsx("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold", category === c.value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2")}>
                <c.icon size={14} /> {c.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Link (optional)"><input className={inputCls} inputMode="url" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="shop.com/that-jacket" /></Field>
        <Field label="Notes (optional)"><textarea rows={2} className={`${inputCls} h-auto py-3`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Size M, the green one" /></Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Add wish</Button>
      </form>
    </Sheet>
  );
}
