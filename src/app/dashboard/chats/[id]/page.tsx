"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { collection, doc, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { nairaText } from "@/lib/quoteShared";
import QuoteCard, { type ClientQuote } from "@/components/QuoteCard";

type Msg = {
  id: string;
  senderRole: "client" | "company" | "system";
  type: string;
  quoteId: string | null;
  text: string;
  createdAt: Timestamp | null;
};
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
  const [quotes, setQuotes] = useState<ClientQuote[]>([]);
  const [walletKobo, setWalletKobo] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ title: string; totalKobo: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const verifiedRef = useRef(false);

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
            return {
              id: d.id,
              senderRole: x.senderRole,
              type: x.type ?? "text",
              quoteId: x.quoteId ?? null,
              text: x.text ?? "",
              createdAt: x.createdAt ?? null,
            };
          })
        ),
      () => setLoadError("Couldn't load the messages.")
    );
    return () => {
      offConv();
      offMsgs();
    };
  }, [user, id]);

  const loadQuotes = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authedFetch(getIdToken, `/api/quotes?conversationId=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = await res.json();
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch {
      /* keep what we have */
    }
  }, [id, getIdToken]);

  const loadWallet = useCallback(async () => {
    try {
      const res = await authedFetch(getIdToken, "/api/hub/wallet");
      if (!res.ok) return;
      const data = await res.json();
      setWalletKobo(typeof data.balanceKobo === "number" ? data.balanceKobo : 0);
    } catch {
      setWalletKobo(null);
    }
  }, [getIdToken]);

  // Quote status lives in the database, so reload on new messages and every 20 seconds.
  useEffect(() => {
    if (!user) return;
    void loadQuotes();
  }, [user, loadQuotes, messages.length]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void loadQuotes(), 20000);
    return () => clearInterval(t);
  }, [user, loadQuotes]);

  const hasOpenQuote = quotes.some((q) => q.status === "sent");
  useEffect(() => {
    if (user && hasOpenQuote) void loadWallet();
  }, [user, hasOpenQuote, loadWallet]);

  // Coming back from Paystack: confirm the payment with the server.
  useEffect(() => {
    if (!user || verifiedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference || !reference.startsWith("quote-")) return;
    verifiedRef.current = true;
    (async () => {
      try {
        const res = await authedFetch(getIdToken, `/api/quotes/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.paid && data.quote) {
          setConfirmed({ title: data.quote.title, totalKobo: data.quote.totalKobo });
        } else if (res.ok && data.refundedToWallet) {
          setNotice("This quotation could no longer be paid, so your money was returned to your Crafteey wallet.");
        } else {
          setNotice("We haven't confirmed your payment yet. This chat will update as soon as we do.");
        }
      } catch {
        setNotice("We couldn't check your payment just now. This chat will update once it is confirmed.");
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
        void loadQuotes();
      }
    })();
  }, [user, getIdToken, loadQuotes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, quotes.length]);

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

  async function payCard(quoteId: string) {
    setBusy(true);
    setSendError(null);
    try {
      const res = await authedFetch(getIdToken, `/api/quotes/${quoteId}/pay`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      setSendError(data.error || "Couldn't start the payment. Try again.");
      void loadQuotes();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't start the payment. Try again.");
    }
    setBusy(false);
  }

  async function payWallet(quoteId: string) {
    const q = quotes.find((x) => x.id === quoteId);
    setBusy(true);
    setSendError(null);
    try {
      const res = await authedFetch(getIdToken, `/api/quotes/${quoteId}/pay-wallet`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (q) setConfirmed({ title: q.title, totalKobo: q.totalKobo });
      } else {
        setSendError(data.error || "Couldn't take the payment. Try again.");
      }
      void loadQuotes();
      void loadWallet();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't take the payment. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function decline(quoteId: string) {
    if (!window.confirm("Decline this quotation?")) return;
    setBusy(true);
    setSendError(null);
    try {
      const res = await authedFetch(getIdToken, `/api/quotes/${quoteId}/decline`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || "Couldn't decline. Try again.");
      }
      void loadQuotes();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't decline. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const quoteById = new Map(quotes.map((q) => [q.id, q]));

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
          {notice && (
            <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {notice}
            </p>
          )}
          {messages.length === 0 && <p className="pt-6 text-center text-sm text-steel">No messages yet.</p>}
          {messages.map((m) => {
            if (m.type === "system") {
              return (
                <div key={m.id} className="flex justify-center">
                  <p className="rounded-full bg-slate-200 px-3 py-1 text-center text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {m.text}
                  </p>
                </div>
              );
            }
            const mine = m.senderRole === "client";
            if (m.type === "quote") {
              const q = m.quoteId ? quoteById.get(m.quoteId) : undefined;
              return (
                <div key={m.id} className="flex justify-start">
                  {q ? (
                    <QuoteCard
                      quote={q}
                      busy={busy}
                      walletKobo={walletKobo}
                      onPayCard={payCard}
                      onPayWallet={payWallet}
                      onDecline={decline}
                    />
                  ) : (
                    <p className="rounded-xl bg-white px-4 py-2 text-sm text-steel shadow-card dark:bg-slate-800">
                      {m.text}
                    </p>
                  )}
                </div>
              );
            }
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

      {confirmed && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-slate-950">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <Check className="h-12 w-12 text-green-600" strokeWidth={3} />
          </div>
          <p className="text-sm font-bold tracking-wide text-green-600">PAYMENT CONFIRMED</p>
          <p className="text-4xl font-extrabold text-brand dark:text-white">{nairaText(confirmed.totalKobo)}</p>
          <p className="text-sm text-steel">{confirmed.title}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">The job is now confirmed.</p>
          <button
            type="button"
            onClick={() => setConfirmed(null)}
            className="mt-4 min-h-12 w-full max-w-xs rounded-xl bg-brand-accent px-5 font-semibold text-white"
          >
            Back to chat
          </button>
        </div>
      )}
    </div>
  );
}