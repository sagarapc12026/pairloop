"use client";
import { createContext, useContext } from "react";
import type { Member, MeResponse } from "@/lib/types";

export type ComposerPrefill = { text?: string; date?: Date | null; listen?: boolean };
export type AppCtx = {
  data: MeResponse;
  members: Member[];
  openComposer: (p?: ComposerPrefill) => void;
  openTask: (id: string) => void;
  openPaywall: (reason?: string) => void;
  openNotifications: () => void;
};
export const Ctx = createContext<AppCtx | null>(null);
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
