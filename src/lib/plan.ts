import type { Space } from "@prisma/client";

export const FREE_TASK_LIMIT = Number(process.env.FREE_TASK_LIMIT || 10);
export const PREMIUM_PRICE_LABEL = "$19.99/year";
export const MAX_MEMBERS = 2;

export function isPremium(space: Pick<Space, "plan" | "premiumUntil">) {
  if (space.plan !== "PREMIUM") return false;
  return !space.premiumUntil || space.premiumUntil.getTime() > Date.now();
}

export function canCreateTask(space: Pick<Space, "plan" | "premiumUntil" | "tasksCreated">) {
  return isPremium(space) || space.tasksCreated < FREE_TASK_LIMIT;
}
