import type { Prisma } from "@prisma/client";

/** Tasks a user may see: everything shared in their loop + their own private tasks. */
export function visibleTasks(userId: string, spaceId: string): Prisma.TaskWhereInput {
  return { spaceId, OR: [{ isPrivate: false }, { createdById: userId }] };
}
