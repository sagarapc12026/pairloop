export type Member = { id: string; name: string; color: string; isOwner: boolean };
export type Me = Member & { email: string };
export type SpaceInfo = {
  id: string; name: string; inviteCode: string; premium: boolean; premiumUntil: string | null;
  tasksCreated: number; freeLimit: number; hasBilling: boolean;
};
export type MeResponse = { me: Me; partner: Member | null; space: SpaceInfo; unread: number };
export type Task = {
  id: string; title: string; notes: string | null; dueAt: string | null; hasTime: boolean;
  priority: "NORMAL" | "HIGH"; isPrivate: boolean; remindersEnabled: boolean;
  createdById: string; assigneeId: string | null; completedAt: string | null; completedById: string | null; createdAt: string;
};
export type WishCategory = "SHOPPING" | "TRAVEL" | "DATE_NIGHT" | "HOME" | "OTHER";
export type Wish = {
  id: string; title: string; notes: string | null; link: string | null; category: WishCategory;
  createdById: string; fulfillerId: string | null; fulfillingAt: string | null; completedAt: string | null; createdAt: string;
};
export type AppNotification = {
  id: string; kind: string; title: string; body: string | null; taskId: string | null; wishId: string | null;
  urgent: boolean; read: boolean; createdAt: string;
};
