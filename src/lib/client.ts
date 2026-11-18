"use client";
import useSWR, { mutate } from "swr";
import type { AppNotification, MeResponse, Task, Wish } from "./types";

import { ApiError, DEMO } from "./errors";
import { demoApi } from "./demo";

export { ApiError, DEMO };

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  if (DEMO) return demoApi<T>(url, opts.method ?? (opts.body ? "POST" : "GET"), (opts.body ?? {}) as Record<string, unknown>);
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && location.pathname.startsWith("/app")) {
    location.href = "/login";
  }
  if (!res.ok) throw new ApiError(data.error || "Something went wrong.", res.status, data.code);
  return data as T;
}

const fetcher = <T,>(url: string) => api<T>(url);
const LIVE = { refreshInterval: 6000, revalidateOnFocus: true };

export function useMe() {
  return useSWR<MeResponse>("/api/me", fetcher<MeResponse>, LIVE);
}
export function useTasks() {
  const r = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher<{ tasks: Task[] }>, LIVE);
  return { ...r, tasks: r.data?.tasks };
}
export function useWishes() {
  const r = useSWR<{ wishes: Wish[] }>("/api/wishes", fetcher<{ wishes: Wish[] }>, LIVE);
  return { ...r, wishes: r.data?.wishes };
}
export function useNotifications() {
  const r = useSWR<{ notifications: AppNotification[] }>("/api/notifications", fetcher<{ notifications: AppNotification[] }>, { refreshInterval: 5000 });
  return { ...r, notifications: r.data?.notifications };
}

export const refreshAll = () => Promise.all(["/api/me", "/api/tasks", "/api/wishes", "/api/notifications"].map((k) => mutate(k)));

/** Optimistically patch one task in the cache, then sync with the server. */
export async function patchTask(id: string, body: Partial<Task> & { completed?: boolean }) {
  await mutate<{ tasks: Task[] }>(
    "/api/tasks",
    async (cur) => {
      const { task } = await api<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body });
      return cur ? { tasks: cur.tasks.map((t) => (t.id === id ? task : t)) } : cur;
    },
    {
      optimisticData: (cur) => {
        if (!cur) return { tasks: [] };
        return {
          tasks: cur.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...body } as Task;
            if (body.completed !== undefined) next.completedAt = body.completed ? new Date().toISOString() : null;
            return next;
          }),
        };
      },
      rollbackOnError: true,
      revalidate: false,
    },
  );
}
