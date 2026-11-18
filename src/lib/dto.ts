import type { Task, Wish, User, Space } from "@prisma/client";
import { FREE_TASK_LIMIT, isPremium } from "./plan";

export function taskDTO(t: Task) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    dueAt: t.dueAt?.toISOString() ?? null,
    hasTime: t.hasTime,
    priority: t.priority,
    isPrivate: t.isPrivate,
    remindersEnabled: t.remindersEnabled,
    createdById: t.createdById,
    assigneeId: t.assigneeId,
    completedAt: t.completedAt?.toISOString() ?? null,
    completedById: t.completedById,
    createdAt: t.createdAt.toISOString(),
  };
}

export function wishDTO(w: Wish) {
  return {
    id: w.id,
    title: w.title,
    notes: w.notes,
    link: w.link,
    category: w.category,
    createdById: w.createdById,
    fulfillerId: w.fulfillerId,
    fulfillingAt: w.fulfillingAt?.toISOString() ?? null,
    completedAt: w.completedAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
  };
}

export function memberDTO(u: User) {
  return { id: u.id, name: u.name, color: u.color, isOwner: u.isOwner };
}

export function spaceDTO(s: Space) {
  const premium = isPremium(s);
  return {
    id: s.id,
    name: s.name,
    inviteCode: s.inviteCode,
    premium,
    premiumUntil: s.premiumUntil?.toISOString() ?? null,
    tasksCreated: s.tasksCreated,
    freeLimit: FREE_TASK_LIMIT,
    hasBilling: !!s.stripeCustomerId,
  };
}
