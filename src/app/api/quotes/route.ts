import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { verifyToken, AuthError } from "@/middleware/auth";
import { getConversationForUser } from "@/lib/chatAccess";
import { finalizePaidQuote } from "@/lib/quotePayments";
import { quoteView } from "@/lib/quoteShared";

export const dynamic = "force-dynamic";

/** GET /api/quotes?conversationId=... : every quote in one chat (for the chat cards). */
export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    const conversationId = req.nextUrl.searchParams.get("conversationId") ?? "";
    const { role } = await getConversationForUser(conversationId, uid);
    await connectToDatabase();

    await Quote.updateMany(
      { conversationId, status: "sent", expiresAt: { $lt: new Date() } },
      { $set: { status: "expired", statusAt: new Date() } }
    );

    // Safety net: a paid quote whose job or company credit didn't finish gets finished here.
    const unfinished = await Quote.find({ conversationId, status: "paid", companyCreditedAt: null }).select("_id");
    for (const q of unfinished) {
      await finalizePaidQuote(String(q._id)).catch((e) => console.error("[quote] heal failed", e));
    }

    const quotes = await Quote.find({ conversationId }).sort({ createdAt: 1 }).limit(50);
    return NextResponse.json({ quotes: quotes.map((q) => quoteView(q, role)) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("quotes list error", err);
    return NextResponse.json({ error: "Couldn't load quotations." }, { status: 500 });
  }
}