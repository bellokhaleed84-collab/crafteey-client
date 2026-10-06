"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collection, doc, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";

type Msg = { id: string; senderRole: "client" | "company"; text: string; createdAt: Timestamp | null };
type ConvInfo = { companyName: string; requestTitle: string; unreadClient: number };

function hhmm(ts: Timestamp | null): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(
    ts.toDate()
  );
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, getIdToken } = useAuth();
  const [conv, setConv] = useState<ConvInfo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    const offConv = onSnapshot(
      doc(db, "conversations", id),
      (snap) => {
        const x = snap.data();
        if (!x) return setLoadError("This chat wasn't found.");
        setConv({
          companyName: x.companyName ?? "Company",
          requestTitle: x.requestTitle ?? "",
          unreadClient: x.unreadClient ?? 0,
        });
      },
      () => setLoadError("You can't open this chat.")
    );
    const offMsgs = onSnapshot(
      query(collection(db, "conversations", id, "messages"), orderBy("createdAt", "asc"), limit(300)),
      (snap) =>
        setMessages(
          snap.docs.map((d) => {
            const x = d.data();
            return { id: d.id, senderRole: x.senderRole, text: x.text ?? "", createdAt: x.createdAt ?? null };
          })
        ),
      () => setLoadError("Couldn't load the messages.")
    );
    return () => {
      offConv();
      offMsgs();
    };
  }, [user, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Clear the unread badge while this chat is open.
  useEffect(() => {
    if (!conv || conv.unreadClient === 0) return;
    void authedFetch(getIdToken, "/api/chat/read", {
      method: "POST",
      body: JSON.stringify({ conversationId: id }),
    }).catch(() => {});
  }, [conv, id, getIdToken]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setBlocked(null);
    setSendError(null);
    try {
      const res = await authedFetch(getIdToken, "/api/chat/send", {
        method: "POST",
        body: JSON.stringify({ conversationId: id, text: t }),
      });
      if (res.ok) {
        setText("");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.blocked) setBlocked(data.error);
      else setSendError(data.error || "Couldn't send your message. Try again.");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send your message. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/dashboard/chats"
          aria-label="Back to chats"
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-bold text-brand dark:text-white">{conv?.companyName ?? "Chat"}</p>
          {conv?.requestTitle && <p className="truncate text-xs text-steel">{conv.requestTitle}</p>}
        </div>
      </header>

      {loadError ? (
        <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      ) : (
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.length === 0 && <p className="pt-6 text-center text-sm text-steel">No messages yet.</p>}
          {messages.map((m) => {
            const mine = m.senderRole === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    mine
                      ? "rounded-br-md bg-brand-accent text-white"
                      : "rounded-bl-md bg-white text-brand shadow-card dark:bg-slate-800 dark:text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/80" : "text-slate-400"}`}>
                    {hhmm(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {!loadError && (
        <form
          onSubmit={send}
          className="space-y-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto w-full max-w-2xl space-y-2">
            {blocked && (
              <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {blocked}
              </p>
            )}
            {sendError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {sendError}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="min-h-12 rounded-xl bg-brand-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}