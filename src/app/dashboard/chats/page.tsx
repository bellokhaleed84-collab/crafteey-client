"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/ui/Skeleton";

type Conv = {
  id: string;
  companyName: string;
  requestTitle: string;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadClient: number;
};

function timeLabel(ts: Timestamp | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(d)
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);
}

export default function ChatsPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Conv[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => {
        setChats(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              companyName: x.companyName ?? "Company",
              requestTitle: x.requestTitle ?? "",
              lastMessage: x.lastMessage ?? "",
              lastMessageAt: x.lastMessageAt ?? null,
              unreadClient: x.unreadClient ?? 0,
            };
          })
        );
        setError(null);
      },
      (err) => {
        console.error("chats listen error", err);
        setError(`Couldn't load your chats (${err.code}).`);
      }
    );
  }, [user]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-brand dark:text-white">Chats</h1>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!chats && !error && <SkeletonList count={3} />}

      {chats && chats.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-brand">No chats yet</p>
          <p className="mt-1 text-sm text-steel">Request a company and your chat opens here.</p>
          <Link
            href="/dashboard/companies"
            className="mt-3 inline-block text-sm font-semibold text-brand-accent underline underline-offset-2"
          >
            Browse companies
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {chats?.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/chats/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card"
          >
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunshine/30 text-base font-bold text-brand"
            >
              {c.companyName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-brand">{c.companyName}</p>
              <p className="truncate text-xs text-steel">{c.requestTitle}</p>
              <p className="truncate text-sm text-steel">{c.lastMessage || "No messages yet"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] text-slate-400">{timeLabel(c.lastMessageAt)}</span>
              {c.unreadClient > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 text-[11px] font-bold text-white">
                  {c.unreadClient}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}