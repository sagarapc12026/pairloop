"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Share2 } from "lucide-react";
import { Button } from "./ui";

export function inviteUrl(code: string) {
  return `${typeof window !== "undefined" ? location.origin : ""}/join/${code}`;
}

export function InviteActions({ code, inviter }: { code: string; inviter: string }) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(code);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg py-1.5 pr-1.5 pl-4">
        <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2 tabular">{url.replace(/^https?:\/\//, "")}</span>
        <Button size="sm" variant="soft" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); toast.success("Link copied"); setTimeout(() => setCopied(false), 2000); }}>
          <Copy size={14} /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {canShare ? (
        <Button className="w-full" onClick={() => navigator.share({ title: "Join me on Pairloop", text: `${inviter} invited you to share tasks on Pairloop`, url }).catch(() => {})}>
          <Share2 size={16} /> Send invite
        </Button>
      ) : null}
    </div>
  );
}
