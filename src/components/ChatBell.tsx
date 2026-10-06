"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participantUids", "array-contains", user.uid));
    return onSnapshot(
      q,
      (snap) =>
        setUnread(
          snap.docs.reduce((n, d) => {
            const x = d.data();
            return n + (x.clientUid === user.uid ? Number(x.unreadClient ?? 0) : 0);
          }, 0)
        ),
      () => {}
    );
  }, [user]);

  return (
    <Link
      href="/dashboard/chats"
      aria-label="Chats"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
    >
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}