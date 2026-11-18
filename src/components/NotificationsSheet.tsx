"use client";
import { useEffect } from "react";
import { mutate } from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell, CheckCircle2, Flame, Gift, UserPlus } from "lucide-react";
import { Sheet, Empty } from "./ui";
import { api, useNotifications } from "@/lib/client";
import { useApp } from "./AppContext";
import { useRouter } from "next/navigation";

const ICON: Record<string, React.ReactNode> = {
  task_done: <CheckCircle2 size={18} className="text-ok" />,
  reminder: <Flame size={18} className="text-urgent" />,
  joined: <UserPlus size={18} className="text-lagoon" />,
  wish_new: <Gift size={18} className="text-orchid" />,
  wish_fulfill: <Gift size={18} className="text-orchid" />,
  wish_done: <Gift size={18} className="text-orchid" />,
};

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications } = useNotifications();
  const { openTask } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      await api("/api/notifications", { body: {} }).catch(() => {});
      mutate("/api/notifications");
      mutate("/api/me");
    }, 1200);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Updates">
      {!notifications?.length ? (
        <Empty icon={<Bell size={28} />} title="Nothing yet">When your partner adds, finishes or hands you something, it shows up here.</Empty>
      ) : (
        <ul className="-mx-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                className="flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left hover:bg-surface-2"
                onClick={() => {
                  onClose();
                  if (n.taskId) openTask(n.taskId);
                  else if (n.wishId) router.push("/app/wishlist");
                }}
              >
                <span className="mt-0.5">{ICON[n.kind] ?? <Bell size={18} className="text-muted" />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14.5px] ${n.read ? "text-ink-2" : "font-semibold"}`}>{n.title}</span>
                  {n.body ? <span className="block text-[13px] text-muted">{n.body}</span> : null}
                </span>
                <span className="shrink-0 text-[12px] text-muted tabular">{formatDistanceToNowStrict(new Date(n.createdAt))}</span>
                {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-urgent" aria-label="Unread" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
