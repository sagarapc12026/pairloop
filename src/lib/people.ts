import type { Member } from "./types";

export const PALETTE: Record<string, { fg: string; soft: string; label: string }> = {
  lagoon: { fg: "var(--lagoon)", soft: "var(--lagoon-soft)", label: "Lagoon" },
  orchid: { fg: "var(--orchid)", soft: "var(--orchid-soft)", label: "Orchid" },
  sun: { fg: "var(--sun)", soft: "var(--sun-soft)", label: "Sunrise" },
  moss: { fg: "var(--moss)", soft: "var(--moss-soft)", label: "Moss" },
};
export const tone = (color?: string | null) => PALETTE[color ?? "lagoon"] ?? PALETTE.lagoon;

export function firstName(name?: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] || "Partner";
}

export function memberById(members: (Member | null | undefined)[], id: string | null | undefined) {
  return members.find((m) => m && m.id === id) ?? null;
}
