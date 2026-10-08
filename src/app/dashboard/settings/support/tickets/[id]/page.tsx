"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLE } from "@/lib/supportLabels";

type Msg = { id: string; senderRole: "client" | "admin"; text: string; createdAt: string };
type Ticket = { id: string; subject: string; category: string; status: string; messages: Msg[] };

const POLL_MS = 5000;

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export default function ReportChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, getIdToken } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const loadedRef = useRef(false);
  const statusRef = useRef("open");

  const load = useCallback(async () => {
    if (!id || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await authedFetch(getIdToken, `/api/support/tickets/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!loadedRef.current) setLoadError(data.error || "Couldn't open this report.");
        return;
      }
      loadedRef.current = true;
      statusRef.current = data.ticket?.status ?? "open";
      setTicket(data.ticket);
      setLoadError(null);
    } catch (err) {
      if (!loadedRef.current) setLoadError(err instanceof Error ? err.message : "Couldn't open this report.");
    } finally {
      inFlight.current = false;
    }
  }, [id, getIdToken]);

  // Refresh every few seconds while the screen is open (stops once the report is fixed).
  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && statusRef.current !== "fixed") void load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [user, load]);

  const count = ticket?.messages.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await authedFetch(getIdToken, `/api/support/tickets/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: t }),
      });
      if (res.ok) {
        setText("");
        await load();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setSendError(data.error || "Couldn't send your message. Try again.");
      void load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send your message. Try again.");
    } finally {
      setSending(false);
    }
  }

  const fixed = ticket?.status === "fixed";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/dashboard/settings/support/tickets"
          aria-label="Back to my reports"
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          {ticket ? (
            <>
              <p className="truncate font-bold text-brand dark:text-white">{ticket.subject}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          )}
        </div>
        {ticket && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              STATUS_STYLE[ticket.status] || STATUS_STYLE.open
            }`}
          >
            {STATUS_LABELS[ticket.status] || ticket.status}
          </span>
        )}
      </header>

      {loadError ? (
        <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
        </p>
      ) : !ticket ? (
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-4 py-4" aria-busy="true">
          <Skeleton className="ml-auto h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {ticket.messages.map((m) => {
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
                  {!mine && <p className="text-[10px] font-bold uppercase opacity-60">Crafteey Support</p>}
                  <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/80" : "text-slate-400"}`}>
                    {when(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          {!fixed && ticket.messages.length > 0 && ticket.messages.every((m) => m.senderRole === "client") && (
            <p className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              We got your report. Our team will reply here soon.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {ticket && fixed && (
        <div className="border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto w-full max-w-2xl space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">This problem was marked fixed, so the chat is closed.</p>
            </div>
            <Link
              href="/dashboard/settings/support/report"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-brand-accent dark:border-slate-700"
            >
              Still need help? Report again
            </Link>
          </div>
        </div>
      )}

      {ticket && !fixed && (
        <form
          onSubmit={send}
          className="space-y-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto w-full max-w-2xl space-y-2">
            {sendError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
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